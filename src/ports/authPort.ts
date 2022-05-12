import {
  APIGatewayTokenAuthorizerEvent,
  AuthResponse,
  PolicyDocument,
  Statement,
  APIGatewayAuthorizerResultContext,
} from 'aws-lambda'

export interface ITokenHeader {
  kid: string
  alg: string
}
interface IPublicKey {
  alg: string
  e: string
  kid: string
  kty: string
  n: string
  use: string
}
interface IPublicKeyMeta {
  instance: IPublicKey
  pem: string
}

export interface IPublicKeys {
  keys: IPublicKey[]
}

export interface IMapOfKidToPublicKey {
  [key: string]: IPublicKeyMeta
}

export interface IClaim {
  sub: string
  email_verified: true
  iss: string
  'cognito:username': string
  given_name: string
  origin_jti: string
  'custom:tenantId': string
  aud: string
  event_id: string
  token_use: string
  'custom:org': string
  auth_time: number
  exp: number
  iat: number
  family_name: string
  jti: string
  email: string
}
export interface IJwtVerificationResult {
  readonly userName?: string
  readonly org?: string
  readonly tenantId?: string
  readonly isValid: boolean
  readonly name?: Iname
  readonly principalId?: string
  readonly error?: any
  readonly token_use?: string
}

interface Iname {
  firstName?: string
  lastName?: string
}

export interface IAuth {
  verifyToken(jwtToken: string): Promise<IJwtVerificationResult>
  getPublicKeys(): Promise<IMapOfKidToPublicKey>
  allowPolicy(idToken: string): PolicyDocument
}
