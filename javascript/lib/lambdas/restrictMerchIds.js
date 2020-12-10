// List of merchids to allow querying for.  Leave it empty to allow all.
const merchid_whitelist = ["496160873888"];

exports.handler = function (event, context, callback) {
  if (
    !merchid_whitelist ||
    merchid_whitelist.includes(event.queryStringParameters.merchid)
  ) {
    callback(null, generatePolicy("Allow"));
  } else {
    callback(null, generatePolicy("Deny"));
  }
};

// Helper function to generate an IAM policy
var generatePolicy = function (effect) {
  return {
    principalId: "user",
    policyDocument: {
      Version: "2012-10-17",
      Statement: [
        {
          Action: "execute-api:Invoke",
          Effect: effect,
          Resource: "*",
        },
      ],
    },
  };
};
