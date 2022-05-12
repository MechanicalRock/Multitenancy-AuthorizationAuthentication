import * as apigateway from 'aws-cdk-lib/aws-apigateway'
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs'
import * as lambda from 'aws-cdk-lib/aws-lambda'
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb'
import * as cognito from 'aws-cdk-lib/aws-cognito'
import * as iam from 'aws-cdk-lib/aws-iam'
import * as cdk from 'aws-cdk-lib'
import * as path from 'path'
import { PolicyDocument, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam'
import { AuthorizationType } from 'aws-cdk-lib/aws-apigateway'

export class multitenantStack extends cdk.Stack {
  REGION = 'ap-southeast-2'
  constructor(scope: cdk.App, env: string, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    // create  rest API
    const api = new apigateway.RestApi(this, 'api', {
      description: 'multiTenancyDemo',
      deployOptions: {
        stageName: env,
        dataTraceEnabled: true,
        tracingEnabled: true,
      },

      // enable CORS
      defaultCorsPreflightOptions: {
        allowHeaders: [
          'Content-Type',
          'X-Amz-Date',
          'Authorization',
          'X-Api-Key',
        ],
        allowMethods: ['OPTIONS', 'GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
        allowCredentials: true,
        allowOrigins: ['http://localhost:3000'],
      },
    })
    // User Pool, (who can authenticate)
    const userPool = new cognito.UserPool(this, env.concat('-user-pool'), {
      userPoolName: env,
      customAttributes: {
        tenantId: new cognito.StringAttribute({ mutable: false }),
        org: new cognito.StringAttribute({ mutable: true }),
      },
      standardAttributes: {
        givenName: {
          required: true,
          mutable: true,
        },
        familyName: {
          required: true,
          mutable: true,
        },

        email: {
          required: true,
          mutable: true,
        },
      },
      selfSignUpEnabled: true,
      signInAliases: {
        username: true,
      },
      autoVerify: {
        email: true,
      },
      passwordPolicy: {
        minLength: 6,
        requireLowercase: true,
        requireDigits: true,
        requireUppercase: false,
        requireSymbols: false,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    })
    const ClientWriteAttributes = new cognito.ClientAttributes()
      .withStandardAttributes({
        givenName: true,
        familyName: true,
        email: true,
      })
      .withCustomAttributes('tenantId', 'org')
    const ClientReadAttributes = ClientWriteAttributes.withStandardAttributes({
      emailVerified: true,
    })
    // User Pool Client
    const userPoolClient = userPool.addClient(env.concat('-user-pool-client'), {
      authFlows: {
        adminUserPassword: true,
        custom: true,
        userSrp: true,
        userPassword: true,
      },
      readAttributes: ClientReadAttributes,
      writeAttributes: ClientWriteAttributes,
      oAuth: {
        callbackUrls: ['https:localhost', 'http://localhost'],
        logoutUrls: ['https:localhost/logout', 'http://localhost/logout'],
      },
      supportedIdentityProviders: [
        cognito.UserPoolClientIdentityProvider.COGNITO,
      ],
    })

    //purchaseHistory table
    const purchaseHistoryTable = new dynamodb.Table(this, 'purchaseHistory', {
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      partitionKey: { name: 'userid', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.NUMBER },
      pointInTimeRecovery: true,
    })

    //  Read from dynamodb
    const readTable = new nodejs.NodejsFunction(this, 'readDynamoDB', {
      environment: {
        userPoolId: userPool.userPoolId,
        cognitoAppClient: userPoolClient.userPoolClientId,
        region: this.region,
        purchaseHistoryTable: purchaseHistoryTable.tableArn,
      },
      memorySize: 1024,
      tracing: lambda.Tracing.ACTIVE,
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 'handler',
      entry: path.join(__dirname, '/../../../src/lambdas/readTable.ts'),
    })

    // Write dynamoDB table
    const writeTable = new nodejs.NodejsFunction(this, 'writeDynamoDB', {
      environment: {
        userPoolId: userPool.userPoolId,
        cognitoAppClient: userPoolClient.userPoolClientId,
        region: this.region,
        purchaseHistoryTable: purchaseHistoryTable.tableArn,
      },
      memorySize: 1024,
      tracing: lambda.Tracing.ACTIVE,
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 'handler',
      entry: path.join(__dirname, '/../../../src/lambdas/writeTable.ts'),
    })

    // Authorization Lambda
    const authLambda = new nodejs.NodejsFunction(this, 'authLambda', {
      environment: {
        userPoolId: userPool.userPoolId,
        cognitoAppClient: userPoolClient.userPoolClientId,
        region: this.region,
        purchaseHistoryTable: purchaseHistoryTable.tableArn,
      },
      memorySize: 1024,
      tracing: lambda.Tracing.ACTIVE,
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 'handler',
      entry: path.join(__dirname, '/../../../src/lambdaAuthorizer.ts'),
    })
    const authorizerRole = new Role(this, 'authorizerRole', {
      roleName: 'authorizerRole',
      assumedBy: new ServicePrincipal('apigateway.amazonaws.com'),
      inlinePolicies: {
        allowLambdaInvocation: PolicyDocument.fromJson({
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Action: ['lambda:InvokeFunction', 'lambda:InvokeAsync'],
              Resource: `arn:aws:lambda:${scope.region}:${scope.account}:function:*`,
            },
          ],
        }),
      },
    })

    const auth = new apigateway.CfnAuthorizer(
      this,
      'CustomAPIGatewayAuthorizer',
      {
        name: 'CustomAuthorizer',
        identitySource: 'method.request.header.Authorization',
        providerArns: [userPool.userPoolArn],
        restApiId: api.restApiId,
        type: 'TOKEN',
        authorizerCredentials: authorizerRole.roleArn, //todo
        authorizerUri: `arn:aws:apigateway:${this.REGION}:lambda:path/2015-03-31/functions/${authLambda.functionArn}/invocations`,
      },
    )

    // add a /purchaseHistory resource
    const invoices = api.root.addResource('purchaseHistory')

    // integrate POST /purchaseHistory with  writeTable Lambda
    const invoicingLambdaPostIntegration = new apigateway.LambdaIntegration(
      writeTable,
      { proxy: true },
    )

    invoices.addMethod('POST', invoicingLambdaPostIntegration, {
      authorizationType: AuthorizationType.CUSTOM,
      authorizer: { authorizerId: auth.attrAuthorizerId },
    })

    // integrate GET /purchaseHistory with  readTable Lambda
    const invoicingLambdaGetIntegration = new apigateway.LambdaIntegration(
      readTable,
      { proxy: true },
    )
    invoices.addMethod('GET', invoicingLambdaGetIntegration, {
      authorizationType: AuthorizationType.CUSTOM,
      authorizer: { authorizerId: auth.attrAuthorizerId },
    })

    //grant permission to writeTable Lambda
    purchaseHistoryTable.grant(
      readTable,
      ...[
        'dynamodb:GetItem',
        'dynamodb:BatchGetItem',
        'dynamodb:Query',
        'dynamodb:PutItem',
        'dynamodb:UpdateItem',
        'dynamodb:DeleteItem',
        'dynamodb:BatchWriteItem',
      ],
    )

    //grant permission to readTable Lambda
    purchaseHistoryTable.grant(
      readTable,
      ...['dynamodb:GetItem', 'dynamodb:BatchGetItem', 'dynamodb:Query'],
    )

    // 👇 create an Output for the API URL
    new cdk.CfnOutput(this, 'apiUrl', { value: api.url })

    //  👇 output an arn for execute-api
    new cdk.CfnOutput(this, 'execute api arn', {
      value: api.arnForExecuteApi(),
    })
    // 👇 Outputs
    new cdk.CfnOutput(this, 'userPoolId', {
      value: userPool.userPoolId,
    })
    new cdk.CfnOutput(this, 'userPoolClientId', {
      value: userPoolClient.userPoolClientId,
    })
  }
}
