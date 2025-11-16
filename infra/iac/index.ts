import * as linode from "@pulumi/linode";

// SSH public key for the deploy user
const authorizedKeys = [
  "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIEznozN3kRkol8jWAt9ioyvPh2hLnSxGEKhsua59UMof jchook@nanos",
];

// Create the instance
export const instance = new linode.Instance("madi-app", {
  label: "madi-app",
  image: "linode/debian12",
  region: "us-east",
  type: "g6-nanode-1",
  rootPass: "your-secure-root-password",
  authorizedKeys,
  metadatas: [
    {
      userData: `#!/bin/bash
set -euo pipefail

apt update
apt install -y docker.io docker-compose git curl jq htop gpg just neovim
`,
    },
  ],
});
