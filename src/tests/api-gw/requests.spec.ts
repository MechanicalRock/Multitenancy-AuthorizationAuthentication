import * as axios from 'axios'
import { InitiateAuthCommandInput, CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider'
import { Auth } from '../auth/auth.lambda'
import * as dotenv from 'dotenv'
import { IDdbClientResponse } from '../../ports/ddbPort'

const apiUrl = 'https://htieqffa0l.execute-api.ap-southeast-2.amazonaws.com/multiTenantStack/cart'
type PostResponse = {
  body: string
  status: number
}
dotenv.config()

describe('(logic) Api calls', () => {
  const token = process.env.AWS_SESSION_TOKEN || ''
  const secret = process.env.AWS_SECRET_ACCESS_KEY || ''
  const key = process.env.AWS_ACCESS_KEY_ID || ''
  const Username = process.env.COGNITO_USER_NAME || ''
  const Password = process.env.COGNITO_USER_PASSWORD || ''
  var validToken: string | undefined
  var invalidToken = 'aaa.b'

  let mockData = [
    { tenantId: 'sith-inc-100', itemId: 123456789 },
    { tenantId: 'jedi-inc-000', itemId: 123456900 },
  ]
  let item2 = {
    productId: 'lts-2094',
    description: 'Light Saber',
    unitPrice: '1000000',
    qty: 1,
  }
  let sithCart = {
    ...mockData[0],
    ...item2,
  }
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
    } catch (error) {
      throw new Error(error as string)
    }
  })
  it('should process a GET request to retrieve item from the database', async () => {
    const res = await axios.default.get<IDdbClientResponse>(apiUrl, {
      //   data: JSON.stringify(sithCart),
      headers: {
        Authorization: `Bearer ${validToken}`,
      },
    })

    console.log(' data:', res.data.response)
  })

  it.todo('should process a PATCH request to update an item in the cart database')
  it.todo('should process a GET request to Query an item in the cart database')
})
