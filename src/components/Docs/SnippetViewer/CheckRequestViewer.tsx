import { getFilteredAllowedLangs, SupportedLanguage, DefaultAuthorizationModelId } from './SupportedLanguage';
import { defaultOperationsViewer } from './DefaultTabbedViewer';
import assertNever from 'assert-never/index';
import { TupleKey } from '@openfga/sdk';

interface CheckRequestViewerOpts {
  authorizationModelId?: string;
  user: string;
  relation: string;
  object: string;
  allowed: boolean;
  contextualTuples?: TupleKey[];
  skipSetup?: boolean;
  allowedLanguages?: SupportedLanguage[];
}

function checkRequestViewer(lang: SupportedLanguage, opts: CheckRequestViewerOpts): string {
  const { user, relation, object, allowed, contextualTuples } = opts;
  const modelId = opts.authorizationModelId ? opts.authorizationModelId : DefaultAuthorizationModelId;

  switch (lang) {
    case SupportedLanguage.PLAYGROUND:
      return `is ${user} related to ${object} as ${relation}?
${
  contextualTuples
    ? `
# Note: Contextual Tuples are not supported on the playground`
    : ''
}

# Response: ${
        allowed ? 'A green path from the user to the object' : 'A red object'
      } indicating that the response from the API is \`{"allowed":${allowed ? 'true' : 'false'}}\`
`;
    case SupportedLanguage.CLI:
      return `fga query check --store-id=$FGA_STORE_ID --model-id=${modelId} ${user} ${relation} ${object}${
        contextualTuples
          ? ` --contextual_tuples ${contextualTuples
              .map((tuple) => `"${tuple.user} ${tuple.relation} ${tuple.object}"`)
              .join(' ')}`
          : ''
      }

# Response: {"allowed":${allowed}}`;
    case SupportedLanguage.CURL:
      /* eslint-disable max-len */
      return `curl -X POST $FGA_SERVER_URL/stores/$FGA_STORE_ID/check \\
  -H "Authorization: Bearer $FGA_API_TOKEN" \\ # Not needed if service does not require authorization
  -H "content-type: application/json" \\
  -d '{"authorization_model_id": "${modelId}", "tuple_key":{"user":"${user}","relation":"${relation}","object":"${object}"}${
        contextualTuples
          ? `,"contextual_tuples":{"tuple_keys":[${contextualTuples
              .map((tuple) => `{"user":"${tuple.user}","relation":"${tuple.relation}","object":"${tuple.object}"}`)
              .join(',')}]}}`
          : '}'
      }'

# Response: {"allowed":${allowed}}`;
    /* eslint-enable max-len */
    case SupportedLanguage.JS_SDK:
      return `
// Run a check
const { allowed } = await fgaClient.check({
    user: '${user}',
    relation: '${relation}',
    object: '${object}',${
        !contextualTuples
          ? `
`
          : `
  contextual_tuples: [${contextualTuples
    .map(
      (tuple) => `
      {
        user: "${tuple.user}",
        relation: "${tuple.relation}",
        object: "${tuple.object}"
      }`,
    )
    .join(',')}
    ]`
      }}, {
  authorization_model_id: '${modelId}',
});

// allowed = ${allowed}`;
    case SupportedLanguage.GO_SDK:
      /* eslint-disable no-tabs */
      return `
options := ClientCheckOptions{
\tAuthorizationModelId: openfga.PtrString("${modelId}"),
}
body := ClientCheckRequest{
\tUser:     "${user}",
\tRelation: "${relation}",
\tObject:   "${object}",${
        !contextualTuples
          ? ''
          : `
\tContextualTuples: &[]ClientTupleKey{
${
  !contextualTuples
    ? ''
    : contextualTuples
        .map(
          (tuple) => `\t\t{
\t\t\tUser:     "${tuple.user}",
\t\t\tRelation: "${tuple.relation}",
\t\t\tObject:   "${tuple.object}",
\t\t}`,
        )
        .join(',\n')
}
\t}`
      }
}

data, err := fgaClient.Check(context.Background()).Body(body).Options(options).Execute()

// data = { allowed: ${allowed} }`;
    case SupportedLanguage.DOTNET_SDK:
      return `
var options = new ClientCheckOptions {
    AuthorizationModelId = "${modelId}",
};
var body = new ClientCheckRequest {
    User = "${user}",
    Relation = "${relation}",
    Object = "${object}",${
        contextualTuples
          ? `,
    ContextualTuples = new List<ClientTupleKey>({
    ${contextualTuples
      .map((tuple) => `new(user: "${tuple.user}", relation: "${tuple.relation}", _object: "${tuple.object}")`)
      .join(',\n    ')}
})`
          : ''
      }
};
var response = await fgaClient.Check(body, options);

// response.Allowed = ${allowed}`;
    case SupportedLanguage.PYTHON_SDK:
      return `options = {
    "authorization_model_id": "${modelId}"
}
body = ClientCheckRequest(
    user="${user}",
    relation="${relation}",
    object="${object}",${
        contextualTuples
          ? `
    contextual_tuples=[
        ${contextualTuples
          .map(
            (tuple) => `ClientTupleKey(user="${tuple.user}", relation="${tuple.relation}", object="${tuple.object}")`,
          )
          .join(',\n                ')}
    ],`
          : ``
      }
)

response = await fga_client.check(body, options)

# response.allowed = ${allowed}
`;
    case SupportedLanguage.RPC:
      return `check(
  user = "${user}", // check if the user \`${user}\`
  relation = "${relation}", // has an \`${relation}\` relation
  object = "${object}", // with the object \`${object}\`
  ${
    contextualTuples
      ? `contextual_tuples = [ // Assuming the following is true
    ${contextualTuples
      .map((tuple) => `{user = "${tuple.user}", relation = "${tuple.relation}", object = "${tuple.object}"}`)
      .join(',\n    ')}
  ],`
      : ''
  } authorization_id = "${modelId}"
);

Reply: ${allowed}`;
    default:
      assertNever(lang);
  }
  /* eslint-enable no-tabs */
}

export function CheckRequestViewer(opts: CheckRequestViewerOpts): JSX.Element {
  const defaultLangs = [
    SupportedLanguage.JS_SDK,
    SupportedLanguage.GO_SDK,
    SupportedLanguage.DOTNET_SDK,
    SupportedLanguage.PYTHON_SDK,
    SupportedLanguage.CLI,
    SupportedLanguage.CURL,
    SupportedLanguage.RPC,
  ];
  const allowedLanguages = getFilteredAllowedLangs(opts.allowedLanguages, defaultLangs);
  return defaultOperationsViewer<CheckRequestViewerOpts>(allowedLanguages, opts, checkRequestViewer);
}
