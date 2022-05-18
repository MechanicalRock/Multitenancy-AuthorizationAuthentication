import { DynamoDbAdapter } from '../../db/ddbAdapter'
import { DeleteCommand, DeleteCommandInput, DynamoDBDocumentClient, GetCommandOutput, QueryCommandInput, QueryCommandOutput } from '@aws-sdk/lib-dynamodb'
import { DynamoDBClient, PutItemCommandInput } from '@aws-sdk/client-dynamodb'
import * as dotenv from 'dotenv'
import { IDbSchema, IProduct, TCartUpdate, TQuery } from '../../ports/ddbPort'
const token = process.env.AWS_SESSION_TOKEN || ''
const secret = process.env.AWS_SECRET_ACCESS_KEY || ''
const key = process.env.AWS_ACCESS_KEY_ID || ''
const id = Date.now()
dotenv.config()
const existingId = 1652757718196
let tableName = 'Demo-purchaseHistory3721EB7F-TGWTLT50BXH4'
let item1 = {
  productId: 'bta-2094',
  description: 'Battle Axe',
  unitPrice: '1000',
  qty: 1,
}
let item2 = {
  productId: 'lts-2094',
  description: 'Light Saber',
  unitPrice: '1000000',
  qty: 1,
}
let item3 = {
  productId: 'smt-2094',
  description: 'Storm Trooper',
  unitPrice: '1000000',
  qty: 1,
}
let mockData = [
  { tenantId: 'sith-inc-100', itemId: 123456789 },
  { tenantId: 'jedi-inc-000', itemId: 123456900 },
]
let sithCart = {
  tenantId: mockData[0].tenantId,
  ...item2,
}
let jediCart = {
  ...mockData[1],
  ...item1,
}
describe('(logic) Table', () => {
  let dynamoDBAdapter: DynamoDbAdapter
  beforeAll(async () => {
    const dynamoDBClient = new DynamoDBClient({
      region: 'ap-southeast-2',
      credentials: {
        accessKeyId: key,
        secretAccessKey: secret,
        sessionToken: token,
      },
    })
    let ddbDocumentClient = DynamoDBDocumentClient.from(dynamoDBClient)
    dynamoDBAdapter = new DynamoDbAdapter(ddbDocumentClient, tableName)
    dynamoDBAdapter.put(jediCart)
  })
  it('Given tenantId# should only return items belonging to tenant', async () => {
    let queryCart: TQuery = {
      KeyConditionExpression: '#partitionKey = :partitionKey',
      ScanIndexForward: true,
      ExpressionAttributeNames: {
        '#partitionKey': 'tenantId',
      },
      ExpressionAttributeValues: {
        ':partitionKey': mockData[1].tenantId,
      },
    }
    const res = await dynamoDBAdapter.getAll(queryCart)

    const data: QueryCommandOutput = res.response as QueryCommandOutput
    const records: IDbSchema[] = data.Items as IDbSchema[]
    const totalRecords = records.length
    if (totalRecords > 0) {
      let recordsWithMatchingTenantID = records.filter((item: IDbSchema) => item.tenantId === mockData[1].tenantId).length
      expect(totalRecords).toBe(recordsWithMatchingTenantID)
    } else throw new Error('could not find any records to check')
  })
  it('Should add items to existing cart', async () => {
    let getItemRes = await dynamoDBAdapter.getItem(mockData[1].tenantId, mockData[1].itemId)
    let itemData: GetCommandOutput = getItemRes.response as GetCommandOutput
    let record: IDbSchema = itemData.Item as IDbSchema
    const oldQty = record.qty
    const updateQty: TCartUpdate = {
      UpdateExpression: 'set #qty = :newQty + #qty',
      ExpressionAttributeValues: {
        ':newQty': 5,
      },
      ExpressionAttributeNames: {
        '#qty': 'qty',
      },
    }
    const updateRes = await dynamoDBAdapter.update(mockData[1].tenantId, mockData[1].itemId, updateQty)
    if (!updateRes.success) throw new Error(updateRes.response.toString())

    getItemRes = await dynamoDBAdapter.getItem(mockData[1].tenantId, mockData[1].itemId)
    itemData = getItemRes.response as GetCommandOutput
    record = itemData.Item as IDbSchema
    const newQty = record.qty
    if (newQty && oldQty) expect(newQty - oldQty).toBe(5)
  })
  it('should remove items from cart', async () => {
    const deleteRes = await dynamoDBAdapter.delete(mockData[1].tenantId, mockData[1].itemId)
    const getItemRes = await dynamoDBAdapter.getItem(mockData[1].tenantId, mockData[1].itemId)
    const itemData = getItemRes.response as GetCommandOutput
    const record = itemData.Item as IDbSchema
    expect(record).toBe(undefined)
  })
})
