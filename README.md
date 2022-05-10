# AWS Authorization and Authentication Tutorial

For new developers, it is not immediately obvious that there is a difference between the terms Authorization and Authentication. Although related, these terms actually refer to two different concepts. Authentication determines if the login credentials provided by a user are allowed to enter the system while authorization determines what a user is allowed to access once they have been authenticated. In short, authentication is about who is allowed in and authorization is about what they are allowed to access. AWS offers a service called Amazon Cognito for both scenarios. In this write up I'll demonstrate how one might go about using Cognito to develop the authentication and authorization layer of a web app that tracks purchases for multiple users.

## Scenario: Multi-tenant purchase tracking microservice

Imagine you are a software engineer who works at a company that has just won a contract to develop an e-commerce web application. You have been tasked with developing the authorization and authentication layer of the Web App's backend. Your team's solutions architect has provided the following architecture to help you visualize how the authorization and authentication layer might look. She has also asked you to test that your implementation works by writing some automated tests.
![image](architecture.png)

##### Lambda Token Authorizer
