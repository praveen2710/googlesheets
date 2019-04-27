<template>
  <div id="wrapper">
    <form-page :form="form" @newRow='addNewRow' @updatedRow='findRowPosition' @reset="resetForm"></form-page>
    <major-list :rows="rows" @editRow='loadRowToEdit'></major-list>
  </div>
</template>

<script>
  import FormPage from '../FormPage/FormPage'
  import MajorList from '../FormPage/MajorList'
  // var moment = require('moment')
  const remote = require('electron').remote
  const app = remote.app

  const fs = require('fs')
  const {google} = require('googleapis')
  var mkdirp = require('mkdirp')
  const path = require('path')
  const fileLoc = path.join(app.getPath('home'), 'offlineData')

  export default {
    name: 'landing-page',
    components: {FormPage, MajorList},
    data () {
      return {
        form: {},
        show: true,
        // If modifying these scopes, delete token.json.
        SCOPES: ['https://www.googleapis.com/auth/spreadsheets'],
        // The file token.json stores the user's access and refresh tokens, and is
        // created automatically when the authorization flow completes for the first
        // time.
        TOKEN_PATH: 'token.json',
        rows: [],
        offLineRowIds: [],
        cachedOnLineRows: [],
        auth: {}
      }
    },
    created () {
      fs.readFile('credentials.json', (err, content) => {
        if (err) return console.log('Error loading client secret file:', err)
        // Authorize a client with credentials, then call the Google Sheets API.
        this.authorize(JSON.parse(content), this.loadFormData)
      })
    },
    methods: {
      open (link) {
        this.$electron.shell.openExternal(link)
      },
      /**
       * Create an OAuth2 client with the given credentials, and then execute the
       * given callback function.
       * @param {Object} credentials The authorization client credentials.
       * @param {function} callback The callback to call with the authorized client.
       */
      authorize (credentials, callback) {
        const oAuth2Client = new google.auth.OAuth2(
          credentials.installed.client_id, credentials.installed.client_secret, credentials.installed.redirect_uris[0])
        // Check if we have previously stored a token.
        fs.readFile(this.TOKEN_PATH, (err, token) => {
          if (err) return this.getNewToken(oAuth2Client, callback)
          oAuth2Client.setCredentials(JSON.parse(token))
          callback(oAuth2Client)
        })
      },
      /**
       * Get and store new token after prompting for user authorization, and then
       * execute the given callback with the authorized OAuth2 client.
       * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
       * @param {getEventsCallback} callback The callback for the authorized client.
       */
      getNewToken (oAuth2Client, callback) {
        const authUrl = oAuth2Client.generateAuthUrl({
          access_type: 'offline',
          scope: this.SCOPES
        })
        console.log('Authorize this app by visiting this url:', authUrl)
        let code = '4/EAEgmB5weTkJBHU31av4ahMkFc4ktzW4u2UuuqaDnDNmFg5c9jEBoac'
        oAuth2Client.getToken(code, (err, token) => {
          if (err) return console.error('Error while trying to retrieve access token', err)
          oAuth2Client.setCredentials(token)
          // Store the token to disk for later program executions
          fs.writeFile(this.TOKEN_PATH, JSON.stringify(token), (err) => {
            if (err) return console.error(err)
            console.log('Token stored to', this.TOKEN_PATH)
          })
          callback(oAuth2Client)
        })
      },
      /**
       * Prints the names and majors of students in a sample spreadsheet:
       * @see https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit
       * @param {google.auth.OAuth2} auth The authenticated Google OAuth client.
       */
      loadFormData (auth) {
        this.rows = []
        this.auth = auth
        const sheets = google.sheets({version: 'v4', auth})
        this.readOnlineRows(sheets).then((retrievedRows) => {
          this.cachedOnLineRows = retrievedRows
          this.rows.push(...retrievedRows)
        }).catch((err) => {
          console.log('failed to retrieve online data currently', err)
          this.rows.push(...this.cachedOnLineRows)
        })
        this.readOfflineRows()
      },
      readOnlineRows (sheets) {
        return new Promise((resolve, reject) => {
          sheets.spreadsheets.values.get({
            spreadsheetId: '14pkSLWxLYMdPO5eYyW0cEV657g1sExqh-5t-k3wfivg',
            range: 'Sheet1!A2:H'
          }, (err, res) => {
            if (err) return reject(err)
            let retrievedRows = []
            for (let i in res.data.values) {
              let rowData = res.data.values[i]
              retrievedRows.push({
                id: rowData[0],
                entryDate: rowData[1], // moment(rowData[1]).format('MMM Do YY'),
                company: rowData[2],
                partyNo: rowData[3],
                pakkaAmt: rowData[4],
                kachaAmt: rowData[5],
                boxes: rowData[6],
                createdDate: rowData[7] // moment(rowData[7]).startOf('day').fromNow()
              })
            }
            resolve(retrievedRows)
          })
        })
      },
      addNewRow (form) {
        const auth = this.auth
        const sheets = google.sheets({version: 'v4', auth})
        sheets.spreadsheets.values.append({
          spreadsheetId: '14pkSLWxLYMdPO5eYyW0cEV657g1sExqh-5t-k3wfivg',
          range: 'Sheet1!A2:H',
          valueInputOption: 'RAW',
          insertDataOption: 'INSERT_ROWS',
          resource: {
            values: [
              [form.id, form.entryDate, form.company, form.partyNo, form.pakkaAmt, form.kachaAmt, form.boxes, form.createdDate]
            ]
          },
          auth: auth
        }, (err, res) => {
          if (err) {
            this.writeDataToFile(form)
            return console.log('The API returned an error: ' + err)
          }
          this.loadFormData(auth)
          this.resetForm()
          this.uploadOfflineRows()
        })
      },
      writeDataOnline (formData) {
        return new Promise((resolve, reject) => {
          const auth = this.auth
          const sheets = google.sheets({version: 'v4', auth})
          sheets.spreadsheets.values.append({
            spreadsheetId: '14pkSLWxLYMdPO5eYyW0cEV657g1sExqh-5t-k3wfivg',
            range: 'Sheet1!A2:H',
            valueInputOption: 'RAW',
            insertDataOption: 'INSERT_ROWS',
            resource: {
              values: [
                [formData.id, formData.entryDate, formData.company, formData.partyNo, formData.pakkaAmt, formData.kachaAmt, formData.boxes, formData.createdDate]
              ]
            },
            auth: auth
          }, (err, res) => {
            if (err) reject(err)
            resolve('Sucess')
          })
        })
      },
      writeDataToFile (data) {
        const component = this
        let fileName = data.id
        mkdirp(fileLoc, function (err) {
          if (err) alert('Data was not saved please write it somewhere', err)
          // path exists unless there was an error
          fs.writeFile(path.join(fileLoc, fileName), JSON.stringify(data), (err) => {
            if (err) alert('Data was not saved please write it somewhere', err)
            component.resetForm()
            component.loadFormData(component.auth)
          })
        })
      },
      readOfflineRows () {
        const component = this
        fs.readdir(fileLoc, (err, files) => {
          if (err) return console.error(err)
          files.forEach(file => {
            component.offLineRowIds.push(file)
            fs.readFile(path.join(fileLoc, file), (err, content) => {
              if (err) return console.log('Error loading data file:', err)
              // Authorize a client with credentials, then call the Google Sheets API.
              component.rows.push(JSON.parse(content))
            })
          })
        })
      },
      uploadOfflineRows () {
        const component = this
        fs.readdir(fileLoc, (err, files) => {
          if (err) return console.error(err)
          files.forEach(file => {
            fs.readFile(path.join(fileLoc, file), (err, content) => {
              if (err) return console.log('Error loading data file:', err)
              // Authorize a client with credentials, then call the Google Sheets API.
              const rowData = JSON.parse(content)

              if (component.findRowOnline(rowData) === undefined) {
                console.log('row never uploaded creating new entry')
                component.writeDataOnline(rowData).then(() => {
                  fs.unlinkSync(path.join(fileLoc, file))
                }).catch(() => {
                  console.log('upload failed will retry again later')
                })
              } else {
                console.log('row exists already updating it')
                component.updateOnlineRow(rowData, this.findRowOnline(rowData)).then(() => {
                  fs.unlinkSync(path.join(fileLoc, file))
                }).catch(() => {
                  console.log('upload failed will retry again later')
                })
              }
            })
          })
        })
      },
      loadRowToEdit (editRow) {
        this.form = {...editRow}
      },
      findRowPosition (updatedRow) {
        if (this.offLineRowIds.includes(updatedRow.id)) {
          console.log('file saved offline overwrite it')
          this.writeDataToFile(updatedRow)
        } else {
          this.updateOnlineRow(updatedRow, this.findRowOnline(updatedRow)).then(() => {
            this.loadFormData(this.auth)
          }).catch(() => {
            this.writeDataToFile(updatedRow)
          })
        }
      },
      findRowOnline (rowData) {
        let i = 0
        if (this.rows != null) {
          for (let index in this.cachedOnLineRows) {
            i += 1
            if (this.cachedOnLineRows[index].id === rowData.id) {
              console.log("IT'S A MATCH! i= " + i)
              let rangeToUpdate = 'A' + (i + 1) + ':H' + (i + 1) // row to be updated
              return rangeToUpdate
            }
          }
        }
      },
      resetForm () {
        this.form = {}
      },
      updateOnlineRow (form, range) {
        return new Promise((resolve, reject) => {
          const auth = this.auth
          const sheets = google.sheets({version: 'v4', auth})
          sheets.spreadsheets.values.update({
            spreadsheetId: '14pkSLWxLYMdPO5eYyW0cEV657g1sExqh-5t-k3wfivg',
            range: 'Sheet1!' + range,
            valueInputOption: 'RAW',
            resource: {
              values: [
                [form.id, form.entryDate, form.company, form.partyNo, form.pakkaAmt, form.kachaAmt, form.boxes, form.createdDate]
              ]
            },
            auth: auth
          }, (err, res) => {
            if (err) {
              reject(err)
            }
            resolve('Success')
          })
        })
      }
    }
  }
</script>

<style>
  @import url('https://fonts.googleapis.com/css?family=Source+Sans+Pro');

  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  body { font-family: 'Source Sans Pro', sans-serif; }

  #wrapper {
    background:
      radial-gradient(
        ellipse at top left,
        rgba(255, 255, 255, 1) 40%,
        rgba(229, 229, 229, .9) 100%
      );
    height: 100vh;
    padding: 60px 80px;
    width: 100vw;
  }

  #logo {
    height: auto;
    margin-bottom: 20px;
    width: 420px;
  }

  main {
    display: flex;
    justify-content: space-between;
  }

  main > div { flex-basis: 50%; }

  .left-side {
    display: flex;
    flex-direction: column;
  }

  .welcome {
    color: #555;
    font-size: 23px;
    margin-bottom: 10px;
  }

  .title {
    color: #2c3e50;
    font-size: 20px;
    font-weight: bold;
    margin-bottom: 6px;
  }

  .title.alt {
    font-size: 18px;
    margin-bottom: 10px;
  }

  .doc p {
    color: black;
    margin-bottom: 10px;
  }

  .doc button {
    font-size: .8em;
    cursor: pointer;
    outline: none;
    padding: 0.75em 2em;
    border-radius: 2em;
    display: inline-block;
    color: #fff;
    background-color: #4fc08d;
    transition: all 0.15s ease;
    box-sizing: border-box;
    border: 1px solid #4fc08d;
  }

  .doc button.alt {
    color: #42b983;
    background-color: transparent;
  }
</style>