import { useState } from "react";
import logo from "./logo.svg";
import "./App.css";
import { ShareModal } from "lit-access-control-conditions-modal";
import LitJsSdk from "lit-js-sdk";

const GOOGLE_CLIENT_KEY = process.env.REACT_APP_CLIENT_KEY;

function App() {
  const gapi = window.gapi;

  const [googleAccessKey, setGoogleAccessKey] = useState("");
  const [litNodeClient, setLitNodeClient] = useState({});
  const [link, setLink] = useState("");
  const [shareLink, setShareLink] = useState("");
  const [role, setRole] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [token, setToken] = useState("");
  const [accessControlConditions, setAccessControlConditions] = useState([]);
  const [linkToDelete, setLinkToDelete] = useState("");

  function authenticate() {
    return gapi.auth2
      .getAuthInstance()
      .grantOfflineAccess()
      .then(async (authResult) => {
        if (authResult.code) {
          var litNodeClient = new LitJsSdk.LitNodeClient();
          await litNodeClient.connect();
          setLitNodeClient(litNodeClient);
          setToken(authResult.code);
        } else {
          console.log("Error logging in");
        }
      });
  }

  gapi.load("client:auth2", function () {
    gapi.auth2.init({
      client_id: GOOGLE_CLIENT_KEY,
      scope:
        "https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/drive.file",
    });
  });

  const addToAccessControlConditions = (r) => {
    setAccessControlConditions(accessControlConditions.concat(r));
  };

  const removeIthAccessControlCondition = (i) => {
    let slice1 = accessControlConditions.slice(0, i);
    let slice2 = accessControlConditions.slice(
      i + 1,
      accessControlConditions.length
    );
    setAccessControlConditions(slice1.concat(slice2));
  };

  const handleSubmit = () => {
    const regex = /d\/(.{44})/g;
    let id = link.match(regex)[0];
    id = id.slice(2, id.length);
    const requestOptions = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        driveId: id,
        role: role,
        token: token,
        accessControlConditions: accessControlConditions,
      }),
    };
    fetch("http://localhost:8080/api/share", requestOptions)
      .then((response) => response.json())
      .then(async (data) => {
        console.log(data);
        const accessControlConditions = data["authorizedControlConditions"];
        const uuid = data["uuid"];
        console.log(accessControlConditions);
        const chain = accessControlConditions[0].chain;
        const authSig = await LitJsSdk.checkAndSignAuthMessage({
          chain,
        });
        const resourceId = {
          baseUrl: "http://localhost:8080",
          path: "/l/" + uuid,
          orgId: "",
          role: role.toString(),
          extraData: "",
        };
        console.log(accessControlConditions);
        console.log("About to save");
        await litNodeClient.saveSigningCondition({
          accessControlConditions,
          chain,
          authSig,
          resourceId,
        });
        setShareLink("http://localhost:8080/l/" + uuid);
      });
  };

  if (shareLink !== "") {
    return <div>Share link: {shareLink}</div>;
  }

  if (token === "") {
    return (
      <div className="App">
        <header className="App-header">
          <button type="button" onClick={authenticate}>
            Log in with Google
          </button>
        </header>
      </div>
    );
  }

  return (
    <div className="App">
      <header className="App-header">
        <p>Enter the link to the drive file below.</p>
        <form>
          <label for="drive-link">Drive Link</label>
          <input
            type="text"
            name="drive-link"
            id="drive-link"
            onChange={(e) => setLink(e.target.value)}
          />

          <p>Added Access Control Conditions (click to delete)</p>
          {accessControlConditions.map((r, i) => (
            <>
              <button onClick={() => removeIthAccessControlCondition(i)}>
                {JSON.stringify(r)}
              </button>
            </>
          ))}
          <button type="button" onClick={() => setModalOpen(true)}>
            Add access control conditions
          </button>
          {modalOpen && (
            <ShareModal
              show={false}
              onClose={() => setModalOpen(false)}
              sharingItems={[{ name: link }]}
              onAccessControlConditionsSelected={(restriction) => {
                addToAccessControlConditions(restriction);
                setModalOpen(false);
              }}
            />
          )}
          <br />
          <label for="drive-role">Drive Role to share</label>
          <select
            name="drive-role"
            id="drive-role"
            onChange={(e) => setRole(parseInt(e.target.selectedIndex))}
          >
            <option value="read">Read</option>
            <option value="comment">Comment</option>
            <option value="write">Write</option>
          </select>
          <button type="button" onClick={handleSubmit}>
            Get share link
          </button>
        </form>
      </header>
    </div>
  );
}

export default App;
