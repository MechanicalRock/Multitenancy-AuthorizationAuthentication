# AWS Authorization and Authentication Tutorial

For new developers, it is not immediately obvious that there is a difference between the terms Authorization and Authentication. Although related, these terms actually refer to two different concepts.

Authentication determines if the login credentials provided by a user are allowed to enter the system while authorization determines what a user is allowed to access once they have been authenticated.

In short, authentication is about who is allowed in and authorization is about what they are allowed to access. AWS offers a service called Amazon Cognito for both scenarios.

In this write up I'll demonstrate how one might go about using Cognito to develop the authentication and authorization layer of a web app that tracks purchases for multiple users.

## Background Knowledge

#### What is a JWT

#### Cognito JWTs

#### Lambda Authorizer

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
