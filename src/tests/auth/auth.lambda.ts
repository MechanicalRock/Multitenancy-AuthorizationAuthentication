import {
  InitiateAuthCommand,
  InitiateAuthCommandInput,
  CognitoIdentityProviderClient,
} from '@aws-sdk/client-cognito-identity-provider'

export const Auth = async (params: InitiateAuthCommandInput, client: CognitoIdentityProviderClient) => {
  const authCommand = new InitiateAuthCommand(params)
  const initiateCommandOutput = await client.send(authCommand)
  const challengeName = initiateCommandOutput.ChallengeName
  const challengeParams = initiateCommandOutput.ChallengeParameters
  const session = initiateCommandOutput.Session

  if (!challengeName) return initiateCommandOutput.AuthenticationResult?.IdToken
  else return JSON.stringify({ challengeName, session, challengeParams })
}
