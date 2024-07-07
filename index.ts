import * as pulumi from "@pulumi/pulumi";
import { setupWebsocketApi } from "./src/setup-websocket-api";

const { api, stage } = setupWebsocketApi();

export const ws_api_url = pulumi.interpolate`${api.apiEndpoint}/${stage.name}/`;
