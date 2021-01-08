module.exports = {
  overview: [
    "fundamentals",
    "get-started",
    {
      type: 'category',
      label: 'Data Access',
      collapsed: false,
      items: [
        "typeorm-helper",
        "mongoose-helper"
      ],
    },
    "swagger",
    "social-login",
    "serve-static",
    "file-upload",
    {
      "Reference": [
        "application-startup",
        "controller",
        "routing",
        "generic-controller",
        "validation",
        "authorization",
        "middleware",
        "facility",
        "default-environment-variable"
      ]
    },
    {
      "Advanced": [
        "extend",
        "reflection-basic",
        "metaprogramming",
        "custom-parameter-binding",
        "custom-validator",
        "custom-authorization",
        "custom-dependency-resolver",
        "custom-route-generator"
      ]
    },
  ]
};
