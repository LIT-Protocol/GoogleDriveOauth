import { useState, useEffect } from "react";
import LitJsSdk from "lit-js-sdk";

function Link() {
    const gapi = window.gapi;

    const [conditionsFetched, setConditionsFetched] = useState(false);
    const [error, setError] = useState("");
    const [litNodeClient, setLitNodeClient] = useState({});
    const [linkData, setLinkData] = useState([]);
    const [email, setEmail] = useState("");
    const [uuid, setUuid] = useState("");

    useEffect(() => {
	if (conditionsFetched === false) {
	    const uuid = /[^/]*$/.exec(window.location.pathname)[0];
	    setUuid(uuid);
	    const requestOptions = {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ uuid: uuid }),
	    };
	    fetch("http://localhost:8080/api/conditions", requestOptions)
		.then((response) => response.json())
		.then(async (data) => {
		    setConditionsFetched(true);

		    const litNodeClient = new LitJsSdk.LitNodeClient();
		    await litNodeClient.connect();
		    setLitNodeClient(litNodeClient);

		    setLinkData(data);
		})
		.catch((err) => {
		    setError("Invalid link");
		});
	}
    });

    gapi.load("client:auth2", function () {
	gapi.auth2.init({
	    client_id:
            "788318511760-576lveaqp1v3fk921tfo8k9rqf19ljp0.apps.googleusercontent.com",
	    scope:
            "https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/drive.file",
	});
    });    

    async function provisionAccess() {
	const chain = "polygon";
	const resourceId = {
	    baseUrl: "http://localhost:8080",//http://localhost:8080",
	    path: "/l/" + uuid,
	    orgId: "",
	    role: linkData["role"].toString(),
	    extraData: "",
	};

	const authSig = await LitJsSdk.checkAndSignAuthMessage({ chain: chain });
	
	const params = {
	    accessControlConditions: linkData["requirements"],
	    chain: chain,
	    authSig: authSig,
	    resourceId: resourceId,
	};
	
	const jwt = await litNodeClient.getSignedToken(params);

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
		    fetch("http://localhost:8080/api/delete", requestOptions)
			.then((res) => {
			    if (res.status == 500) {
				setError("Error deleting link; were you the creator of this link?");
			    } else {
				setError("Successfully deleted this link.")
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
		.then((data) => window.location.replace("https://docs.google.com/document/d/"+data));
	});
    };

    if (error !== "") {
	return <div>{error}</div>;
    }

    if (conditionsFetched === false) {
	return <div>Getting data...</div>;
    }    
    else {
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
// New share link: http://localhost:8080/l/4fbe2a79-9880-4b71-ada1-55603fadcd1c
export default Link;
