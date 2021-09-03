import { useState, useEffect } from 'react';
import LitJsSdk from 'lit-js-sdk';

function Link() {

    const [conditionsFetched, setConditionsFetched] = useState(false);
    const [accessControlConditions, setAccessControlConditions] = useState([]);
    const [email, setEmail] = useState("");

    useEffect(() => {
	if (conditionsFetched === false) {
	    const requestOptions = {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ 'uuid': /[^/]*$/.exec(window.location.pathname)[0] })
	    }	    
	    fetch('http://localhost:8080/api/conditions', requestOptions)
	        .then(response => response.json())
	        .then(data => {
		    setConditionsFetched(true);
		    setAccessControlConditions(data);
		    console.log(data);
		});
	}

    });
	    
    if (conditionsFetched === false) {
    return (
	<div>
	    Getting data...
	</div>
    )
    }

    async function provisionAccess() {
	var litNodeClient = new LitJsSdk.LitNodeClient()
	const chain = "polygon"	
	litNodeClient.connect()
	const roles = ["read", "comment", "write"]
	const path = "/document/d/" + accessControlConditions["drive_id"]
	const resourceId = {
	    baseUrl: "https://docs.google.com",
	    path: path,
	    orgId: "",
	    role: roles[accessControlConditions["role"]],
	    extraData: ""
	}
	const authSig = await LitJsSdk.checkAndSignAuthMessage({chain: chain});
/*	await litNodeClient.saveSigningCondition({
	    accessControlConditions: accessControlConditions["requirements"],
	    chain: chain,
	    authSig: authSig,
	    resourceId: resourceId
	});*/

	const jwt = await litNodeClient.getSignedToken({
	    accessControlConditions: accessControlConditions["requirements"],
	    chain: chain,
	    authSig: authSig,
	    resourceId: resourceId
	});

	return jwt
    };
    
    const handleSubmit = () => {

	provisionAccess().then(jwt => {	
	    const requestOptions = {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ 'jwt': jwt })
	    }
	    fetch('http://localhost:8080/api/share', requestOptions)
		.then(response => response.text())
		.then(data => console.log(data));
	});
    }

    if (conditionsFetched === true) {
    return (
	    <div>
	    <label for="email-input">
	    Enter your Google Account email here
	    </label>
	    <input type="text" name="email-input" id="email-input" onChange={e => setEmail(e.target.value)}/>
	    <button type="button" onClick={handleSubmit}>Request Access</button>
	</div>
    )
    }		      
}

export default Link;
