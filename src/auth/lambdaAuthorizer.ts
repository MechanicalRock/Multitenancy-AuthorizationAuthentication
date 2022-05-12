import { AuthAdapter } from './authAdapter'
import {
  APIGatewayTokenAuthorizerEvent,
  AuthResponse,
  Context,
} from 'aws-lambda'
import * as dotenv from 'dotenv'
dotenv.config()

const UserPoolId = process.env.userPoolId || ''
const Region = process.env.Region || ''

let cachedKey: string

export const handler = async (
  event: APIGatewayTokenAuthorizerEvent,
  context: Context,
) => {
  cachedKey = event.authorizationToken
  if (Region === '') throw new Error('region not supplied')
  if (UserPoolId === '') throw new Error(' UserpoolId not supplied')
  const accountId = context.invokedFunctionArn.split(':')[4]
  const authAdapter = new AuthAdapter(Region, UserPoolId, accountId)
  const verificationResult = await authAdapter.verifyToken(cachedKey)
  if (verificationResult.isValid) {
    const authResponse: AuthResponse = {
      principalId: verificationResult.principalId as string,
      policyDocument: authAdapter.allowPolicy(),
      context: {
        org: verificationResult.org,
        tenantId: verificationResult.tenantId,
        firstName: verificationResult.name?.firstName,
        lastName: verificationResult.name?.lastName as string,
      },
    }
    return authResponse
  } else {
    return {
      principalId: '',
      policyDocument: authAdapter.denyPolicy(),
    }
  }
}
