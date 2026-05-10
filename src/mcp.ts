#!/usr/bin/env node
// ton-sovereign-mcp — MCP server entry point.
// v0.8.0-rc1: stub only. The real implementation lands at v0.8.0 GA per
// docs/v0.8/mcp-core-requirements.md and the Epic at issue #4.
//
// Per [F1] #5, this stub MUST exit non-zero so an agent that mistakenly
// invokes the rc1 build of `ton-sovereign-mcp` fails fast with an actionable
// message rather than silently doing nothing.

const message = [
  'ton-sovereign-mcp: not implemented in v0.8.0-rc1.',
  '',
  'rc1 ships only the CLI (`ton-sovereign-deploy`) plus the discoverability',
  'artifacts (README "Agent quickstart", npm keywords). The MCP server lands',
  'at v0.8.0 GA — see https://github.com/Masashi-Ono0611/sovereign-deploy-kit/issues/15',
  '(M1 bootstrap) and https://github.com/Masashi-Ono0611/sovereign-deploy-kit/issues/4',
  '(Epic). For now, agents should fall back to invoking the CLI directly:',
  '',
  '  npx -y ton-sovereign-deploy <build-dir> --domain <name>.ton --json-output',
  '',
].join('\n')

// Print to stderr so it doesn't pollute MCP stdout (which a real client would
// have parsed as a protocol message).
process.stderr.write(message + '\n')
process.exit(1)
