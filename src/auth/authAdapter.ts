import { IAuth, IClaim, IJwtVerificationResult, IMapOfKidToPublicKey, IPublicKeys, ITokenHeader } from '../ports/authPort'
import { PolicyDocument } from 'aws-lambda'
import * as Axios from 'axios'
import * as jwt from 'jsonwebtoken'
import { promisify } from 'util'
var jwkToPem = require('jwk-to-pem')

export class AuthAdapter implements IAuth {
  private PublicKeysUrl: string
  private CognitoIssuer: string
  private executeApiArn: string
  private cartTable: string
  private cacheKeys: IMapOfKidToPublicKey | undefined
  constructor(region: string, userPoolId: string, accountId: string, cartTable: string, executeApiArn: string) {
    this.PublicKeysUrl = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}/.well-known/jwks.json`
    this.CognitoIssuer = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`
    this.executeApiArn = executeApiArn
    this.cartTable = cartTable
  }

  allowPolicy(tenantId: string): PolicyDocument {
    const policyDocument: PolicyDocument = {
      Version: '2012-10-17',

      Statement: [
        {
          Action: 'execute-api:Invoke',
          Effect: 'Allow',
          Resource: this.executeApiArn,
        },
        {
          Action: ['dynamodb:UpdateItem', 'dynamodb:PutItem', 'dynamodb:DeleteItem', 'dynamodb:Query'],
          Effect: 'Allow',
          Resource: this.cartTable,
          Condition: {
            'ForAllValues:StringLike': {
              'dynamodb:LeadingKeys': tenantId,
            },
          },
        },
      ],
    }
    return policyDocument
  }

  denyPolicy(): PolicyDocument {
    const policyDocument: PolicyDocument = {
      Version: '2012-10-17',
      Statement: [
        {
          Action: '*',
          Effect: 'Deny',
          Resource: this.executeApiArn,
        },
      ],
    }

    return policyDocument
  }
  getPublicKeys = async (): Promise<IMapOfKidToPublicKey> => {
    if (!this.cacheKeys) {
      const url = this.PublicKeysUrl
      const publicKeys = await Axios.default.get<IPublicKeys>(url)
      this.cacheKeys = publicKeys.data.keys.reduce((agg, current) => {
        const pem = jwkToPem(current)
        agg[current.kid] = { instance: current, pem }
        return agg
      }, {} as IMapOfKidToPublicKey)
      return this.cacheKeys
    } else {
      return this.cacheKeys
    }
  }
  verifyToken = async (jwtToken: string): Promise<IJwtVerificationResult> => {
    if (jwtToken) {
      const verifyPromised = promisify(jwt.verify.bind(jwt))
      let result: IJwtVerificationResult
      try {
        const tokenSections = jwtToken.split('.')
        if (tokenSections.length !== 3) this.__errorMessages('token is invalid, token must be of the form <header>.<payload>.<signature>')
        const headerString = Buffer.from(tokenSections[0], 'base64').toString('utf8')
        const headerJSON = JSON.parse(headerString) as ITokenHeader
        const publicKeys = await this.getPublicKeys()
        const publicKey = publicKeys[headerJSON.kid]
        if (publicKey === undefined) this.__errorMessages('claim made for unknown kid')
        const claim = (await verifyPromised(jwtToken, publicKey.pem)) as IClaim
        const currentSeconds = Math.floor(new Date().valueOf() / 1000)
        if (currentSeconds > claim.exp || currentSeconds < claim.auth_time) return this.__errorMessages('claim is expired or invalid')

        if (claim.iss !== this.CognitoIssuer) return this.__errorMessages('claim issuer is invalid')
        if (claim.token_use !== 'id') return this.__errorMessages('claim use is not id')

        return {
          token_use: claim.token_use,
          principalId: claim.sub,
          userName: claim['cognito:username'],
          name: { firstName: claim.given_name, lastName: claim.family_name },
          tenantId: claim['custom:tenantId'],
          org: claim['custom:org'],
          tokenIsValid: true,
        }
      } catch (error) {
        let message = 'unknown error'
        if (error instanceof Error) message = error.message
        result = this.__errorMessages(message)
      }
      return result
    } else {
      return this.__errorMessages('token is undefined')
    }
  }

  __errorMessages = (message: string) => {
    console.error(message)
    return {
      error: message,
      tokenIsValid: false,
    }
  }
}
