# AWS Authorization and Authentication Tutorial

For new developers, it is not immediately obvious that there is a difference between the terms Authorization and Authentication. Although related, these terms actually refer to two different concepts. Authentication determines if the login credentials provided by a user are allowed to enter the system while authorization determines what a user is allowed to access once they have been authenticated. In short, authentication is about who is allowed in and authorization is about what they are allowed to access. AWS offers a service called Amazon Cognito for both scenarios.

In this write up I'll demonstrate how one might go about using Cognito to develop the authentication and authorization layer of a web app that tracks purchases for multiple users.

## Background Knowledge

#### What is a JWT

A JSON Web Token, JWT, is an open standard that is widely used to securely share authentication information (claims) between a client and a server. The standard is defined in the RFC7519 spec developed by the Internet Engineering Taskforce (IETF). JWTs are signed using cryptography algorithms in order to provide the assurance of integrity by providing a means to detect post creation modification. In addition, JWTs can also be encrypted in order to prevent unauthorized access.

#### Cognito JWTs

AWS has adopted and adapted the RFC7519 standard for use with the cognito service.
When a user successfully authenticates with cognito, cognito creates a session before responding to the authentication request with (3) JWTs - access token, id token and refresh token.
These tokens can be used to grant access to server-side resources or to the Amazon API Gateway. Alternatively they can be exchanged for temporary AWS credentials in order to access other AWS services.

Let's take a closer look at the cognito JWTs mentioned above.

###### ID Token

The ID token is a JWT that contains claims related to the identity of the authenticated user i.e email, phone number and custom attributes. When used to authenticate users of a web app, the signature of the token must be verified before the claims stored in the token can be trusted.

###### Access Token

The access token is a JWT that contains claims related to the authenticated user's groups and scopes. Access tokens are similar to id tokens with very few exceptions. For example ID tokens allow the use of custom attributes whereas access tokens do not. To get a full understanding of what an access token is and how it differs from an id token refer to the the following resources.

[using access tokens](https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-using-the-access-token.html)
[using id tokens](https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-using-the-id-token.html)

###### Refresh Token

#### Lambda Authorizer

###### Verifying tokens

## Scenario: Multi-tenant purchase tracking microservice

Imagine you are a software engineer who works at a company that has just won a contract to develop an e-commerce web application.
You have been tasked with developing the authorization and authentication layer of the Web App's backend.
Your team's solutions architect has provided the following architecture to help you visualize how the authorization and authentication layer might look.
She has also asked you to write validation tests to prove that your implementation works as expected.
![image](architecture.png)

1. Users authenticate with a username and password, the web app passes these to amazon cognito for validation.
2. If the supplied credentials (username and password) are valid, cognito creates a session and subsequently issues three (3) JWTs (JSON Web Tokens). The aforementioned tokens are id token, access token and a refresh token. The authenticated user can now send requests to api gateway along with with the id token in the headers section.
3. API gateway sends the received id token to a lambda function called an authorizer.
4. The authorizer function verifies the claims attached to the id token.
5. The authorizer returns a policy and context.
6. API Gateway evaluates the policy and forwards the request to a lambda function along with the authorizer generated context.
7. The lambda function writes/reads data according to the tenantId listed in the forwarded context.
8. A response is returned by the lambda function.
