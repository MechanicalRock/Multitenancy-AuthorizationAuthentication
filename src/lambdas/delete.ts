import * as AWS from 'aws-sdk'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { APIGatewayEvent, APIGatewayProxyResult, Context } from 'aws-lambda'
import { DynamoDbAdapter } from '../db/ddbAdapter'
import { IContext } from '../ports/authPort'
import { isContext } from 'vm'
AWS.config.update({ region: 'ap-south-east-2' })
const region = process.env.REGION || ''
const tableName = process.env.TABLE_NAME || ''

export const handler = async (event: APIGatewayEvent, context: Context): Promise<APIGatewayProxyResult> => {
  const dynamoDBClient = new DynamoDBClient({
    region: region,
  })
  let ctx: IContext = context.clientContext?.Custom as IContext
  const sk: number = parseInt(event.body as string)
  const dynamoDBAdapter = new DynamoDbAdapter(dynamoDBClient, tableName)
  const res = await dynamoDBAdapter.delete(ctx.tenantId, sk)
  if (!res.success) throw new Error(res.response as string)
  return {
    statusCode: 200,
    body: JSON.stringify(res),
  }
}
