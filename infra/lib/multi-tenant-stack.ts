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
  region = 'ap-southeast-2'
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
        allowHeaders: ['Content-Type', 'X-Amz-Date', 'Authorization', 'X-Api-Key'],
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
      supportedIdentityProviders: [cognito.UserPoolClientIdentityProvider.COGNITO],
    })

    //purchaseHistory table
    const cartTable = new dynamodb.Table(this, 'purchaseHistory', {
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      partitionKey: { name: 'tenantId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'itemId', type: dynamodb.AttributeType.NUMBER },
      pointInTimeRecovery: true,
    })

    //  Lambdas
    const deleteItemLambda = new nodejs.NodejsFunction(this, 'deleteItem', {
      environment: {
        userPoolId: userPool.userPoolId,
        cognitoAppClient: userPoolClient.userPoolClientId,
        region: this.region,
        purchaseHistoryTable: cartTable.tableArn,
      },
      memorySize: 1024,
      tracing: lambda.Tracing.ACTIVE,
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 'handler',
      entry: path.join(__dirname, '/../../src/lambdas/delete.ts'),
    })

    const putItemLambda = new nodejs.NodejsFunction(this, 'putItem', {
      environment: {
        userPoolId: userPool.userPoolId,
        cognitoAppClient: userPoolClient.userPoolClientId,
        region: this.region,
        purchaseHistoryTable: cartTable.tableArn,
      },
      memorySize: 1024,
      tracing: lambda.Tracing.ACTIVE,
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 'handler',
      entry: path.join(__dirname, '/../../src/lambdas/put.ts'),
    })

    const queryItemsLambda = new nodejs.NodejsFunction(this, 'queryItems', {
      environment: {
        userPoolId: userPool.userPoolId,
        cognitoAppClient: userPoolClient.userPoolClientId,
        region: this.region,
        purchaseHistoryTable: cartTable.tableArn,
      },
      memorySize: 1024,
      tracing: lambda.Tracing.ACTIVE,
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 'handler',
      entry: path.join(__dirname, '/../../src/lambdas/query.ts'),
    })

    const updateItemLambda = new nodejs.NodejsFunction(this, 'updateItem', {
      environment: {
        userPoolId: userPool.userPoolId,
        cognitoAppClient: userPoolClient.userPoolClientId,
        region: this.region,
        purchaseHistoryTable: cartTable.tableArn,
      },
      memorySize: 1024,
      tracing: lambda.Tracing.ACTIVE,
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 'handler',
      entry: path.join(__dirname, '/../../src/lambdas/update.ts'),
    })

    const authLambda = new nodejs.NodejsFunction(this, 'authLambda', {
      environment: {
        userPoolId: userPool.userPoolId,
        cognitoAppClient: userPoolClient.userPoolClientId,
        region: this.region,
        purchaseHistoryTable: cartTable.tableArn,
      },
      memorySize: 1024,
      tracing: lambda.Tracing.ACTIVE,
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 'handler',
      entry: path.join(__dirname, '/../../src/auth/lambdaAuthorizer.ts'),
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

    const auth = new apigateway.CfnAuthorizer(this, 'CustomAPIGatewayAuthorizer', {
      name: 'CustomAuthorizer',
      identitySource: 'method.request.header.Authorization',
      providerArns: [userPool.userPoolArn],
      restApiId: api.restApiId,
      type: 'TOKEN',
      authorizerCredentials: authorizerRole.roleArn, //todo
      authorizerUri: `arn:aws:apigateway:${this.region}:lambda:path/2015-03-31/functions/${authLambda.functionArn}/invocations`,
    })

    // add a /cart resource
    const cart = api.root.addResource('cart')

    //lambda integrations
    const putItemLambdaIntegration = new apigateway.LambdaIntegration(putItemLambda, { proxy: true })
    const deleteItemLambdaIntegration = new apigateway.LambdaIntegration(deleteItemLambda, { proxy: true })
    const updateItemLambdaIntegration = new apigateway.LambdaIntegration(updateItemLambda, { proxy: true })
    const queryItemsLambdaIntegration = new apigateway.LambdaIntegration(queryItemsLambda, { proxy: true })

    cart.addMethod('POST', putItemLambdaIntegration, {
      authorizationType: AuthorizationType.CUSTOM,
      authorizer: { authorizerId: auth.attrAuthorizerId },
    })
    cart.addMethod('POST', deleteItemLambdaIntegration, {
      authorizationType: AuthorizationType.CUSTOM,
      authorizer: { authorizerId: auth.attrAuthorizerId },
    })
    cart.addMethod('POST', updateItemLambdaIntegration, {
      authorizationType: AuthorizationType.CUSTOM,
      authorizer: { authorizerId: auth.attrAuthorizerId },
    })
    cart.addMethod('GET', queryItemsLambdaIntegration, {
      authorizationType: AuthorizationType.CUSTOM,
      authorizer: { authorizerId: auth.attrAuthorizerId },
    })
    //grant dynamoDb permissions
    cartTable.grant(deleteItemLambda, ...['dynamodb:DeleteItem'])
    cartTable.grant(putItemLambda, ...['dynamodb:PutItem'])

    //  create an Output for the API URL
    new cdk.CfnOutput(this, 'apiUrl', { value: api.url })

    //   output an arn for execute-api
    new cdk.CfnOutput(this, 'execute api arn', {
      value: api.arnForExecuteApi(),
    })
    //  Outputs
    new cdk.CfnOutput(this, 'userPoolId', {
      value: userPool.userPoolId,
    })
    new cdk.CfnOutput(this, 'userPoolClientId', {
      value: userPoolClient.userPoolClientId,
    })
  }
}
