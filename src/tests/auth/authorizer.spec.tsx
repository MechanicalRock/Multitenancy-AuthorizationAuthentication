import { Auth } from './auth.lambda'
import { InitiateAuthCommandInput, CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider'
import { handler as authHandler } from '../../auth/lambdaAuthorizer'
import * as dotenv from 'dotenv'
import { APIGatewayTokenAuthorizerEvent, AuthResponse } from 'aws-lambda'
dotenv.config()
let validTokenVerification: AuthResponse
let invalidTokenVerification: AuthResponse
let context: IContext

const lambdaContextObject = {
  functionName: '',
  functionVersion: '',
  invokedFunctionArn: '',
  memoryLimitInMB: '',
  logGroupName: '',
  logStreamName: '',
  getRemainingTimeInMillis: () => {
    return 100
  },
  awsRequestId: '',
  callbackWaitsForEmptyEventLoop: false,
  done: () => {},
  fail: () => {},
  succeed: () => {},
}
interface IContext {
  org: string
  tenantId: string
  firstName: string
  lastName: string
  token_use: string
}
const token = process.env.AWS_SESSION_TOKEN || ''
const secret = process.env.AWS_SECRET_ACCESS_KEY || ''
const key = process.env.AWS_ACCESS_KEY_ID || ''
const Username = process.env.COGNITO_USER_NAME || ''
const Password = process.env.COGNITO_USER_PASSWORD || ''
let validAuthEvent: APIGatewayTokenAuthorizerEvent
let invalidAuthEvent: APIGatewayTokenAuthorizerEvent

var validToken: string | undefined
var invalidToken = 'aaa.b'
describe('(logic) Given a  valid lambda authorizer  event', () => {
  beforeAll(async () => {
    const initiateCommandInput: InitiateAuthCommandInput = {
      AuthFlow: 'USER_PASSWORD_AUTH',
      ClientId: process.env.COGNITO_CLIENT_ID as string,
      AuthParameters: {
        USERNAME: Username,
        PASSWORD: Password,
      },
    }
    const client = new CognitoIdentityProviderClient({
      region: 'ap-southeast-2',
      credentials: {
        accessKeyId: key,
        secretAccessKey: secret,
        sessionToken: token,
      },
    })

    try {
      validToken = await Auth(initiateCommandInput, client)
      validAuthEvent = {
        type: 'TOKEN',
        methodArn: '',
        authorizationToken: validToken as string,
      }
      validTokenVerification = await authHandler(validAuthEvent, lambdaContextObject)
      context = validTokenVerification.context as unknown as IContext
    } catch (error) {
      throw new Error(error as string)
    }

    try {
      invalidAuthEvent = {
        type: 'TOKEN',
        methodArn: '',
        authorizationToken: invalidToken,
      }
      invalidTokenVerification = await authHandler(invalidAuthEvent, lambdaContextObject)
    } catch (error) {
      throw new Error(error as string)
    }
  })

  it('should return an allow policy if token conforms to verification checks', () => {
    expect(validTokenVerification.policyDocument.Statement[0].Effect).toBe('Allow')
  })
  it('should return a deny policy if token is malformed', () => {
    expect(invalidTokenVerification.policyDocument.Statement[0].Effect).toBe('Deny')
  })
})
