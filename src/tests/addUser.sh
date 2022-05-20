aws cognito-idp admin-create-user \
  --user-pool-id [user pool id here] \
  --username [email here] \
  --user-attributes Name="custom:tenantId",Value="sith-inc-100"  Name="custom:org",Value="galactic empire" Name="given_name",Value="Anakin"  Name="family_name",Value="Skywalker"

aws cognito-idp  admin-confirm-sign-up \
--user-pool-id [user pool id here] \
--username [email here] \


aws cognito-idp admin-set-user-password \
--user-pool-id [user pool id here] \
--username [email here] \
--password [password here] \
--permanent