// List of merchids to allow querying for
const merchid_whitelist = process.env.MERCHIDS.split(",");

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

exports.handler = function (event, context, callback) {
  allow = merchid_whitelist.includes(event.queryStringParameters.merchid);
  callback(null, generatePolicy(allow));
};
