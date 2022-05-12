#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib'
import { multitenantStack } from '../lib/multi-tenant-stack'
const app = new cdk.App()
// new CognitoStack(app, 'CognitoStack', 'Demo')
new multitenantStack(app, 'multiTenantStack', 'Demo')
