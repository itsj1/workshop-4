import bodyParser from "body-parser";
import express from "express";
import axios from "axios";
import { BASE_ONION_ROUTER_PORT } from "../config";
import { REGISTRY_PORT } from "../config";
import { generateRsaKeyPair, exportPubKey, exportPrvKey, importPrvKey, rsaDecrypt, symDecrypt } from "../crypto";
import { Node } from "../registry/registry";

export async function simpleOnionRouter(nodeId: number) {
  const onionRouter = express();
  onionRouter.use(express.json());
  onionRouter.use(bodyParser.json());


  let lastMessageSource: number | null = null;
  let lastMessageDestination: number | null = null;

  onionRouter.get("/status", (req, res) => {
    res.send("live");
  });

  let lastReceivedEncryptedMessage: string | null = null;
  onionRouter.get("/getLastReceivedEncryptedMessage", (req, res) => {
    res.json({ result: lastReceivedEncryptedMessage });
  });

  let lastReceivedDecryptedMessage: string | null = null;
  onionRouter.get("/getLastReceivedDecryptedMessage", (req, res) => {
    res.json({ result: lastReceivedDecryptedMessage });
  });


  onionRouter.get("/getLastMessageDestination", (req, res) => {
    res.json({ result: lastMessageDestination });
  });



  const keyPair = await generateRsaKeyPair();
  const publicKey = await exportPubKey(keyPair.publicKey);
  const privateKey = await exportPrvKey(keyPair.privateKey);


  //Register les nodes
  try {
    const response = await axios.post(`http://localhost:${REGISTRY_PORT}/registerNode`, {
      nodeId,
      pubKey: publicKey,
    }, {
      headers: {
        "Content-Type": "application/json",
      },
    });
    console.log(response.data);
  } catch (error) {
    console.error("Error registering node:", error);
  }


  //getPrivateKey
  onionRouter.get("/getPrivateKey", (req, res) => {
    res.json({ result: privateKey });
  });


  onionRouter.post("/sendMessage", async (req, res) => {
    const { message, destinationUserId } = req.body;
    let circuit: Node[] = [];
    const nodesResponse = await axios.get(`http://localhost:${REGISTRY_PORT}/getNodeRegistry`);
    const nodes = nodesResponse.data.nodes;

    while (circuit.length < 3) {
      const randomIndex = Math.floor(Math.random() * nodes.length);
      if (!circuit.includes(nodes[randomIndex])) {
        circuit.push(nodes[randomIndex]);
      }
    }
    res.sendStatus(200);
  });



  onionRouter.post("/message", async (req, res) => {
    const layer = req.body.message;
    const encryptedSymKey = layer.slice(0, 344);
    const symKey = privateKey ? await rsaDecrypt(encryptedSymKey, await importPrvKey(privateKey)) : null;
    const encryptedMessage = layer.slice(344) as string;
    const message = symKey ? await symDecrypt(symKey, encryptedMessage) : null;

    lastReceivedEncryptedMessage = layer;
    lastReceivedDecryptedMessage = message ? message.slice(10) : null;
    lastMessageSource = nodeId;
    lastMessageDestination = message ? parseInt(message.slice(0, 10), 10) : null;

    await fetch(`http://localhost:${lastMessageDestination}/message`, {
      method: "POST",
      body: JSON.stringify({ message: lastReceivedDecryptedMessage }),
      headers: {
        "Content-Type": "application/json",
      },
    });

    res.send("success");
  });

  const server = onionRouter.listen(BASE_ONION_ROUTER_PORT + nodeId, () => {
    console.log(`Onion router ${nodeId} is listening on port ${BASE_ONION_ROUTER_PORT + nodeId}`);
  });

  return server;
}
