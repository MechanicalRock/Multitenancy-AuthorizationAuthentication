import {
  IAuth,
  IClaim,
  IJwtVerificationResult,
  IMapOfKidToPublicKey,
  IPublicKeys,
  ITokenHeader,
} from '../ports/authPort'
import { PolicyDocument } from 'aws-lambda'
import * as Axios from 'axios'
import * as jwt from 'jsonwebtoken'
import { promisify } from 'util'
var jwkToPem = require('jwk-to-pem')

export class AuthAdapter implements IAuth {
  private PublicKeysUrl: string
  private CognitoIssuer: string
  private executeApiArn: string
  private cacheKeys: IMapOfKidToPublicKey | undefined
  constructor(region: string, userPoolId: string, accountId: string) {
    this.PublicKeysUrl = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}/.well-known/jwks.json`
    this.CognitoIssuer = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`
    this.executeApiArn = `arn:aws:execute-api:${region}:${accountId}:*/*/*/purchaseHistory`
  }

  allowPolicy(): PolicyDocument {
    const policyDocument: PolicyDocument = {
      Version: '2012-10-17',
      Statement: [
        {
          Action: 'execute-api:Invoke',

          Effect: 'Allow',
          Resource: this.executeApiArn,
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
          Action: 'execute-api:Invoke',
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
    const verifyPromised = promisify(jwt.verify.bind(jwt))
    let result: IJwtVerificationResult
    try {
      const tokenSections = jwtToken.split('.')
      if (tokenSections.length !== 3) {
        return {
          error:
            'token is invalid, token must be of the form <header>.<payload>.<signature>',
          isValid: false,
        }
      }
      const headerString = Buffer.from(tokenSections[0], 'base64').toString(
        'utf8',
      )
      const headerJSON = JSON.parse(headerString) as ITokenHeader
      const publicKeys = await this.getPublicKeys()
      const publicKey = publicKeys[headerJSON.kid]
      if (publicKey === undefined) {
        result = {
          error: 'claim made for unknown kid',
          isValid: false,
        }
      }
      const claim = (await verifyPromised(jwtToken, publicKey.pem)) as IClaim
      const currentSeconds = Math.floor(new Date().valueOf() / 1000)
      if (currentSeconds > claim.exp || currentSeconds < claim.auth_time) {
        return {
          error: 'claim is expired or invalid',
          isValid: false,
        }
      }

      if (claim.iss !== this.CognitoIssuer) {
        return {
          error: 'claim issuer is invalid',
          isValid: false,
        }
      }
      if (claim.token_use !== 'id') {
        return {
          error: 'claim use is not id',
          isValid: false,
        }
      }
      return {
        token_use: claim.token_use,
        principalId: claim.sub,
        userName: claim['cognito:username'],
        name: { firstName: claim.given_name, lastName: claim.family_name },
        tenantId: claim['custom:tenantId'],
        org: claim['custom:org'],
        isValid: true,
      }
    } catch (error) {
      console.log(error)
      result = {
        token_use: '',
        principalId: '',
        userName: '',
        tenantId: '',
        org: '',
        name: {},
        error,
        isValid: false,
      }
    }
    return result
  }
}
