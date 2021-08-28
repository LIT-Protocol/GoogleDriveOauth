import { useState } from 'react';
import logo from './logo.svg';
import './App.css';
import { ShareModal } from 'lit-access-control-conditions-modal'
import { GoogleLogin } from 'react-google-login';


const responseF = (response) => {
    console.log("ResponseF")
    console.log(response)
}

function App() {
    const gapi = window.gapi
    console.log(gapi)
    const [googleAccessKey, setGoogleAccessKey] = useState("");

    const signIn = () => {

    }
    
    const responseS = (response) => {
	console.log(response);
	console.log(gapi.auth2.getAuthInstance());
	gapi.client.load("https://content.googleapis.com/discovery/v1/apis/drive/v3/rest")
            .then(function() {
		console.log("GAPI client loaded for API");
			gapi.client.drive.permissions.create({
	  "fileId": "1w8FQTu7ojPyf8onL_424xgeqRoYnVWctB-txoUTKjlw",
	  "resource": {
	    "role": "writer",
	    "type": "user",
	    "emailAddress": "oauth-test@apt-subset-305716.iam.gserviceaccount.com"
	  }
	})
	    .then(function(response) {
		    // Handle the results here (response.result has the parsed body).
		    console.log("Response", response);
		  },
		  function(err) { console.error("Execute error", err); });
	    },
                function(err) { console.error("Error loading GAPI client for API", err); });


    }


      function authenticate() {
    return gapi.auth2.getAuthInstance()
        .signIn({scope: "https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/drive.file"})
              .then(function() { console.log("Sign-in successful"); responseS(); },
              function(err) { console.error("Error signing in", err); });
  }
    
      gapi.load("client:auth2", function() {
    gapi.auth2.init({client_id: "788318511760-576lveaqp1v3fk921tfo8k9rqf19ljp0.apps.googleusercontent.com"});
      });

    const [link, setLink] = useState("");
    const [role, setRole] = useState("read");
    const [modalOpen, setModalOpen] = useState(false);

    const [restrictions, setRestrictions] = useState([]);

    const addToRestrictions = (r) => {
	setRestrictions(restrictions.concat(r));
    }

    const removeIthRestriction = (i) => {
	let slice1 = restrictions.slice(0, i)
	let slice2 = restrictions.slice(i+1,restrictions.length)
	setRestrictions(slice1.concat(slice2));
    }

    const handleSubmit = () => {
	const regex = /d\/(.{44})/g;
	let id = link.match(regex)[0];
	id = id.slice(2, id.length)
	const requestOptions = {
	    method: 'POST',
	    headers: { 'Content-Type': 'application/json' },
	    body: JSON.stringify({ 'drive-id': id, "role": role, "allowed-groups": restrictions})
	}
	fetch('http://localhost:3001/api/share', requestOptions)
	    .then(response => console.log(response));
    }
    
  return (
    <div className="App">


	  
      <header className="App-header">        
          <p>
	  Please allow this app to share your files on your behalf.
        </p>



      // Form ask for role, file URL
	  <form  onSubmit={handleSubmit}>
	  <label for="drive-link">
	  Drive Link
	  </label>      
          <input type="text" name="drive-link" id="drive-link" onChange={e => setLink(e.target.value)}/>

	  <p>Added restrictions (click to delete)</p>
	  {restrictions.map((r, i) => <><button onClick={() => removeIthRestriction(i)}>{JSON.stringify(r)}</button></>)}
	  <button type="button" onClick={() => setModalOpen(true)}>Grant access</button>	
	  {modalOpen &&
	   	  <ShareModal
      show={false}
	   onClose={() => setModalOpen(false)}
      sharingItems={[{"name": link}]}
	   onAccessControlConditionsSelected={(restriction) => { addToRestrictions(restriction); setModalOpen(false)}}
           />
	  }
	  <label for="drive-role">
	  Drive Role to share
          </label>
	  <select name="drive-role" id="drive-role" onChange={e => setRole(e.target.value)}>
	  <option value="read">Read</option>
	  <option value="comment">Comment</option>
	  <option value="write">Write</option>
	  </select>      
          <input type="submit" value="Get share link"/>
	  </form>      
      </header>	   
	  
    </div>
  );
}

export default App;
