import * as axios from 'axios'
import { InitiateAuthCommandInput, CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider'
import { Auth } from '../auth/auth.lambda'
import * as dotenv from 'dotenv'
import { IDdbClientResponse, IDbSchema } from '../../ports/ddbPort'
import { APIGatewayProxyResultV2 } from 'aws-lambda'
import { QueryCommandOutput } from '@aws-sdk/lib-dynamodb'
const apiUrl = 'https://htieqffa0l.execute-api.ap-southeast-2.amazonaws.com/multiTenantStack/cart'

dotenv.config()

describe('(logic) Api calls', () => {
  const token = process.env.AWS_SESSION_TOKEN || ''
  const secret = process.env.AWS_SECRET_ACCESS_KEY || ''
  const key = process.env.AWS_ACCESS_KEY_ID || ''
  const Username = process.env.COGNITO_USER_NAME || ''
  const Password = process.env.COGNITO_USER_PASSWORD || ''
  var validToken: string | undefined

  const timeStamp = Date.now()
  let mockData = [
    { tenantId: 'sith-inc-100', itemId: timeStamp },
    { tenantId: 'jedi-inc-000', itemId: timeStamp },
  ]
  let item2 = {
    productId: 'lts-2094',
    description: 'Light Saber',
    unitPrice: '1000000',
    qty: 1,
  }
  let sithCart: IDbSchema = {
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
  it('should process a POST request to add a new item to the database', async () => {
    const apigwRes = await axios.default.post<APIGatewayProxyResultV2>(apiUrl, sithCart, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${validToken}`,
      },
    })
    const handlerRes = apigwRes.data as IDdbClientResponse
    expect(handlerRes.success).toBe(true)
  })
  it('should process a GET request to retrieve item from the database', async () => {
    const apigwRes = await axios.default.get<APIGatewayProxyResultV2>(apiUrl, {
      headers: {
        Authorization: `Bearer ${validToken}`,
      },
    })

    const handlerRes = apigwRes.data as IDdbClientResponse

    const queryOutput = handlerRes.response as QueryCommandOutput
    const records = queryOutput.Items as IDbSchema[]
    console.log(records)
    expect(handlerRes.success).toBe(true)
  })

  it.todo('should process a PATCH request to update an item in the cart database')
  it.todo('should process a GET request to Query an item in the cart database')
})
