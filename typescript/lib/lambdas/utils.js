// Helper function to generate an IAM policy
var generatePolicy = function (allow) {
  return {
    principalId: "user",
    policyDocument: {
      Version: "2012-10-17",
      Statement: [
        {
          Action: "execute-api:Invoke",
          Effect: allow ? "Allow" : "Deny",
          Resource: "*",
        },
      ],
    },
  };
};

module.exports = { generatePolicy };
