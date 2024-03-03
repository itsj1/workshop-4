import bodyParser, { json } from "body-parser";
import express, { Request, Response } from "express";
import { REGISTRY_PORT } from "../config";

export type Node = { nodeId: number; pubKey: string };

export type RegisterNodeBody = {
  nodeId: number;
  pubKey: string;
};

export type GetNodeRegistryBody = {
  nodes: Node[];
};


export async function launchRegistry() {
  const _registry = express();
  _registry.use(express.json());
  _registry.use(bodyParser.json());

  let getNodeRegistryBody: GetNodeRegistryBody = { nodes: [] };

  //registerNode
  _registry.post("/registerNode", (req: Request<RegisterNodeBody>, res: Response) => {
    const { nodeId, pubKey } = req.body;
    getNodeRegistryBody.nodes.push({ nodeId, pubKey });
    res.json({ result: "success" });
  });


  _registry.get("/getNodeRegistry", (req, res) => {
    res.json(getNodeRegistryBody);
  });

  _registry.get("/status", (req, res) => {
    res.send("live");
  });

  let lastReceivedEncryptedMessage: string | null = null;
  _registry.get("/getLastReceivedEncryptedMessage", (req: Request, res: Response<{ result: string | null }>) => {
    res.json({ result: lastReceivedEncryptedMessage });
  });

  const server = _registry.listen(REGISTRY_PORT, () => {
    console.log(`Registry is listening on port ${REGISTRY_PORT}`);
  });

  return server;
}