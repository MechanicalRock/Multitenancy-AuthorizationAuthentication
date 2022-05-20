import {
  DynamoDBDocumentClient,
  PutCommand,
  PutCommandOutput,
  PutCommandInput,
  DeleteCommandOutput,
  UpdateCommandOutput,
  QueryCommandOutput,
  GetCommandOutput,
  UpdateCommandInput,
  QueryCommandInput,
  DeleteCommand,
  GetCommand,
  QueryCommand,
  UpdateCommand,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb'

export interface IDbSchema extends IProduct {
  tenantId: string
  itemId: number | (() => number)
}
export interface IProduct {
  productId?: string
  description?: string
  unitPrice?: string
  qty?: number
}

export declare type TCartUpdate = Omit<UpdateCommandInput, 'Key' | 'Expected' | 'TableName'>

export declare type TQuery = Omit<QueryCommandInput, 'TableName'>

export interface IDdbClientResponse {
  response: CommandOutput
  success: boolean
}

type CommandOutput = PutCommandOutput | UpdateCommandOutput | QueryCommandOutput | GetCommandOutput | string

export type TDdbClientCommand = PutCommand | DeleteCommand | UpdateCommand | QueryCommand | GetCommand

export interface IDdb {
  put(items: IDbSchema): Promise<IDdbClientResponse>
  delete(pk: string, sk: number): Promise<IDdbClientResponse>
  update(pk: string, sk: number, item: TCartUpdate): Promise<IDdbClientResponse>
  getAll(query: TQuery): Promise<IDdbClientResponse>
  getItem(pk: string, sk: number): Promise<IDdbClientResponse>
}
