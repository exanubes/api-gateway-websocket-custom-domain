# Api Gateway Websocket - Custom Domain

A small demo of adding a custom domain to a Websocket API in AWS Api Gateway using [Pulumi](https://pulumi.com).
Created alongside a blog post on [exanubes.com](https://exanubes.com/blog/adding-a-custom-domain-to-api-gateway-websocket-api)

## Setup

### Install dependencies

```bash
pnpm install
```

### Add config

```bash
pulumi config set certificateArn <certificateArn> --secret
pulumi config set hostedZoneId <hostedZoneId> --secret
pulumi config set domainName <domainName>
```

### Deploy

```bash
pulumi up
```