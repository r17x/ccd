/// <reference path="chrome.d.ts" />

/**
 * @namespace Gacor
 */
const noOp = () => { };
const nuLL = () => null;

const API = {
  auth: "/Mobileapi/auth",
  lastCheckIn: "/Mobileapi/LastCheckIndeatils",
  checkInOROut: (token) => `/Mobileapi/CheckInPost?token=${token}`,
};

const checkIn = ({ token, latlng, ...payload }) =>
  fetch(API.checkInOROut(token), {
    method: "POST",
    body: JSON.stringify({
      ...payload,
      message: "checkin",
      location: `${btoa(latlng)}\n`,
      latlng,
      token,
      purpose: "checkin",
      location_type: 2,
      udid: "",
      in_out: 1,
    }),
  });

const checkOut = ({ token, ...payload }) =>
  fetch(API.lastCheckIn, {
    method: "POST",
    body: JSON.stringify({ token }),
  })
    .then((r) => r.json())
    .then((last) =>
      Promise.all([
        Promise.resolve(last.id),
        fetch(API.checkInOROut(token), {
          method: "POST",
          body: JSON.stringify({ checkin_id: last.id, ...payload }),
        })
          .then((r) => r.json())
          .catch(() => null),
      ]),
    );

const log = (x) => {
  console.log("Log:", x);
  return x;
};

const Storage = {
  set: (key, value) =>
    Promise.resolve()
      .then(() => chrome.storage.sync.set({ [key]: value }))
      .then(() => {
        log(`Saved ${key} = ${value.toString()}`);
      }),
  get: (...args) =>
    new Promise((resolve, reject) =>
      chrome.storage.sync.get(args, (result) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(result);
        }
      }),
    ),
};

/**
 * @type (qrcode) => Promise<Gacor.DarwinAuth>
 *
 * export type DarwinAuth = {
 *     token:        string;
 *     user_id:      string;
 *     tenant_id:    string;
 *     expires:      number;
 *     is_manager:   boolean;
 *     status:       number;
 *     message:      string;
 *     user_details: UserDetails;
 * }
 *
 * export type UserDetails = {
 *     name:           string;
 *     email:          string;
 *     user_id:        string;
 *     tenant_id:      string;
 *     mongo_id:       string;
 *     designation:    string;
 *     department:     string;
 *     business_unit:  string;
 *     mobile:         string;
 *     office:         string;
 *     office_address: string;
 *     dob:            string;
 *     doj:            string;
 *     employee_no:    string;
 *     manager_name:   string;
 *     pic48:          string;
 *     pic320:         string;
 *     pic25:          string;
 * }
 */
const getToken = (qrcode) =>
  fetch(API.auth, {
    method: "POST",
    body: JSON.stringify({ qrcode, UDID: "" }),
  })
    .then((r) => r.json())
    .then((r) => {
      if (r.status === 1) return r;
      throw new Error(r);
    })
    .then(log)
    .then((user) => {
      Storage.set("user", user);
    })
    .catch(nuLL);

const footer = document.querySelector("footer");
const footerFloat = document.createElement("footer");

footerFloat.style.background = "var(--primary-color)";
footerFloat.className = footer.className;
footerFloat.style.position = "fixed";
footerFloat.id = "checkIn";

const inputQr = document.createElement("input");
inputQr.className = "text-input-element";
inputQr.placeholder = "QR code here.";
inputQr.addEventListener("change", (e) => {
  getToken(inputQr.value).then((r) => {
    checkInBtn.disabled = false;
    return r;
  });
});

const inputLatLng = document.createElement("input");
inputLatLng.className = "text-input-element";
inputLatLng.placeholder = "Latitude,Longitude code here.";
inputLatLng.addEventListener("change", (e) => {
  Storage.set("latlng", inputLatLng.value);
});

const checkInBtn = document.createElement("button");
checkInBtn.disabled = true;
checkInBtn.className = "btn btn-outline";
checkInBtn.appendChild(document.createTextNode("Check IN"));
checkInBtn.addEventListener("click", () => {
  Storage.get("user").then(({ user }) =>
    checkIn({
      token: user.token,
      latlng: inputLatLng.value,
    }),
  );
});

const checkOutBtn = document.createElement("button");
checkOutBtn.className = "btn btn-secondary";
checkOutBtn.appendChild(document.createTextNode("Check OUT"));
checkOutBtn.addEventListener("click", () => {
  // getOptions('qrcode', 'lists').then(({ qrcode }) => getToken(qrcode)).then(console.info)
});

Promise.resolve()
  .then(() => {
    document.body.append(footerFloat);
  })
  .then(() => {
    footerFloat.append(inputQr);
    footerFloat.append(inputLatLng);
    footerFloat.append(checkInBtn);
    footerFloat.append(checkOutBtn);
  });

// prefilled input
const prefilled = () => {
  Storage.get("latlng", "user").then(({ latlng, user }) => {
    console.log({ user });
    inputLatLng.value = latlng || "";
    checkInBtn.disabled = !Boolean(user.token);
  });
};

prefilled();