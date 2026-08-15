const awsmobile = {
  "aws_project_region": "us-east-2",
  "aws_cognito_region": "us-east-2",
  "aws_user_pools_id": "us-east-2_pLrj1NgHI",
  "aws_user_pools_web_client_id": "3ik571j3u4o4sb13bo7n4o9822",
  "oauth": {
      "domain": "us-east-2plrj1nghi.auth.us-east-2.amazoncognito.com",
      "scope": [
          "email",
          "openid",
          "profile"
      ],
      "redirectSignIn": typeof window !== 'undefined' ? window.location.origin : "http://localhost:5175/",
      "redirectSignOut": typeof window !== 'undefined' ? window.location.origin : "http://localhost:5175/",
      "responseType": "code"
  },
  "federationTarget": "COGNITO_USER_POOLS",
  "aws_cognito_username_attributes": [
      "EMAIL"
  ],
  "aws_cognito_mfa_configuration": "OFF",
  "aws_cognito_mfa_types": [
      "SMS"
  ],
  "aws_cognito_password_protection_settings": {
      "passwordPolicyMinLength": 8,
      "passwordPolicyCharacters": []
  },
  "aws_cognito_verification_mechanisms": [
      "EMAIL"
  ]
};

export default awsmobile;
