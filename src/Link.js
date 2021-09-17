import { useState, useEffect } from "react";
import LitJsSdk from "lit-js-sdk";

const GOOGLE_CLIENT_KEY = process.env.REACT_APP_CLIENT_KEY;
const BASE_URL = process.env.REACT_APP_BASE_URL;

function Link() {
  const gapi = window.gapi;

  const [conditionsFetched, setConditionsFetched] = useState(false);
  const [error, setError] = useState("");
  const [litNodeClient, setLitNodeClient] = useState({});
  const [linkData, setLinkData] = useState([]);
  const [email, setEmail] = useState("");
  const [uuid, setUuid] = useState("");

  gapi.load("client:auth2", function () {
    gapi.auth2.init({
      client_id: GOOGLE_CLIENT_KEY,
      scope:
        "https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/drive.file",
    });
  });    

  useEffect(() => {
    if (conditionsFetched === false) {
      const uuid = /[^/]*$/.exec(window.location.pathname)[0];
      setUuid(uuid);
      const requestOptions = {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uuid: uuid }),
      };
      fetch(BASE_URL+"/api/conditions", requestOptions)
        .then((response) => response.json())
        .then(async (data) => {
          setConditionsFetched(true);

          var litNodeClient = new LitJsSdk.LitNodeClient();
          await litNodeClient.connect();
          setLitNodeClient(litNodeClient);
          console.log(data["requirements"]);
          console.log(typeof data["role"]);
          setLinkData(data);
          console.log(data);
        })
        .catch((err) => {
          setError("Invalid link");
        });
    }
  }, []);

  async function provisionAccess() {
    const chain = linkData.requirements[0].chain;
    const resourceId = {
      baseUrl: BASE_URL,
      path: "/l/" + uuid,
      orgId: "",
      role: linkData["role"].toString(),
      extraData: "",
    };

    const authSig = await LitJsSdk.checkAndSignAuthMessage({ chain });

    const jwt = await litNodeClient.getSignedToken({
      accessControlConditions: linkData["requirements"],
      chain,
      authSig: authSig,
      resourceId: resourceId,
    });

    return jwt;
  }

  const handleDelete = () => {
    return gapi.auth2
      .getAuthInstance()
      .grantOfflineAccess()
      .then(async (authResult) => {
        if (authResult.code) {
          const requestOptions = {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              uuid: uuid,
              token: authResult.code,
            }),
          };
          fetch(BASE_URL+"/api/delete", requestOptions)
            .then((res) => {
              if (res.status === 500) {
                setError(
                  "Error deleting link; were you the creator of this link?"
                );
              } else {
                setError("Successfully deleted this link.");
              }
            })
            .catch(() =>
              setError(
                "Error deleting link; were you the creator of this link?"
              )
            );
        } else {
          setError("Error logging in");
        }
      });
  };

  const handleSubmit = () => {
    provisionAccess().then((jwt) => {
      const role = linkData["role"];
      const requestOptions = {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role, uuid, jwt }),
      };
      fetch("http://localhost:8080/api/sharelink", requestOptions)
        .then((response) => response.text())
        .then(
          (data) =>
            (window.location = `https://docs.google.com/document/d/${data}`)
        );
    });
  };

  if (error !== "") {
    return <div>{error}</div>;
  }

  if (conditionsFetched === false) {
    return <div>Getting data...</div>;
  } else {
    return (
      <div>
        <label for="email-input">Enter your Google Account email here</label>
        <input
          type="text"
          name="email-input"
          id="email-input"
          onChange={(e) => setEmail(e.target.value)}
        />
        <button type="button" onClick={handleSubmit}>
          Request Access
        </button>

        <button type="button" onClick={handleDelete}>
          Delete this link
        </button>
      </div>
    );
  }
}

export default Link;
