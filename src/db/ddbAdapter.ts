import { IDdb, IDbSchema, IProduct, IDdbClientResponse, TCartUpdate, TQuery, TDdbClientCommand } from '../ports/ddbPort'
import {
  DynamoDBDocumentClient,
  PutCommand,
  PutCommandOutput,
  PutCommandInput,
  DeleteCommandOutput,
  UpdateCommandOutput,
  QueryCommandOutput,
  GetCommandInput,
  GetCommand,
  GetCommandOutput,
  UpdateCommand,
  UpdateCommandInput,
  QueryCommandInput,
  QueryCommand,
  ServiceInputTypes,
  ServiceOutputTypes,
  DeleteCommandInput,
  DeleteCommand,
} from '@aws-sdk/lib-dynamodb'
import { SmithyResolvedConfiguration } from '@aws-sdk/smithy-client'
import { Client as IClient, Command, MetadataBearer, MiddlewareStack, RequestHandler } from '@aws-sdk/types'
export class DynamoDbAdapter implements IDdb {
  private ddbClient: DynamoDBDocumentClient
  private tableName: string
  constructor(ddbClient: DynamoDBDocumentClient, tableName: string) {
    this.ddbClient = ddbClient
    this.tableName = tableName
  }
  async getItem(pk: string, sk: number): Promise<IDdbClientResponse> {
    const getItemParams: GetCommandInput = {
      TableName: this.tableName,
      Key: {
        tenantId: pk,
        itemId: sk,
      },
    }

    const getCommand = new GetCommand(getItemParams)
    try {
      const clientRes: GetCommandOutput = await this.ddbClient.send(getCommand)
      return {
        success: true,
        response: clientRes,
      }
    } catch (error) {
      let message = 'unknown error'
      if (error instanceof Error) message = error.message
      return {
        success: false,
        response: message,
      }
    }
  }
  async put(item: IDbSchema): Promise<IDdbClientResponse> {
    const putItemParams: PutCommandInput = {
      TableName: this.tableName,
      Item: item,
    }
    let putItemCommand = new PutCommand(putItemParams)

    try {
      const clientRes: PutCommandOutput = await this.ddbClient.send(putItemCommand)
      return {
        success: true,
        response: clientRes,
      }
    } catch (error) {
      let message = 'unknown error'

      if (error instanceof Error) message = error.message
      return {
        success: false,
        response: message,
      }
    }
  }
  async delete(pk: string, sk: number): Promise<IDdbClientResponse> {
    const deleteParams: DeleteCommandInput = {
      TableName: this.tableName,
      Key: {
        tenantId: pk,
        itemId: sk,
      },
    }
    const deleteCommand = new DeleteCommand(deleteParams)

    try {
      const clientRes: DeleteCommandOutput = await this.ddbClient.send(deleteCommand)
      return {
        success: true,
        response: clientRes,
      }
    } catch (error) {
      let message = 'unkown error'
      if (error instanceof Error) message = error.message
      return {
        success: false,
        response: message,
      }
    }
  }
  async update(pk: string, sk: number, item: TCartUpdate): Promise<IDdbClientResponse> {
    const updateItemParams: UpdateCommandInput = {
      TableName: this.tableName,
      Key: {
        tenantId: pk,
        itemId: sk,
      },
      ...item,
    }
    const updateItemCommand = new UpdateCommand(updateItemParams)
    try {
      const clientRes: UpdateCommandOutput = await this.ddbClient.send(updateItemCommand)
      return { success: true, response: clientRes }
    } catch (error) {
      let message = 'unkown error'
      if (error instanceof Error) message = error.message
      return {
        success: false,
        response: message,
      }
    }
  }
  async getAll(query: TQuery): Promise<IDdbClientResponse> {
    const queryParams: QueryCommandInput = {
      TableName: this.tableName,
      ...query,
    }
    let queryCommand = new QueryCommand(queryParams)

    try {
      const res: QueryCommandOutput = await this.ddbClient.send(queryCommand)
      return {
        success: true,
        response: res,
      }
    } catch (error) {
      let message = 'unknown error'
      if (error instanceof Error) message = error.message
      return {
        success: false,
        response: message,
      }
    }
  }
}
