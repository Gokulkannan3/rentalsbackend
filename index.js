const express = require('express');
const mysql = require('mysql2');
const app = express();
const cors = require('cors');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer');
const setRounds = 10;

app.use(express.json());
app.use(cors({ origin: '*' }));
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
    key: "username",
    secret: "success",
    resave: false,
    saveUninitialized: false,
    cookie: {
        expires: 600000,
    }
}));

const db = mysql.createConnection({
    user: 'avnadmin',
    password: 'AVNS_5W135YZrjuwuLR-WHt5',
    host: 'mysql-39af648c-gokul.a.aivencloud.com',
    database: 'home',
    port: '11941'
});

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "images")
    },
    filename: (req, file, cb) => {
        cb(null, file.fieldname + "_" + Date.now() + path.extname(file.originalname));
    }
})

app.use('/images',express.static('./images'))

const upload = multer({ storage: storage });

app.post('/register', (req, res) => {
    const { name, mail, contact, password, cpassword, address, area, state, country, category } = req.body;

    if (password !== cpassword) {
        return res.status(400).json({ error: 'Password and Confirm Password do not match' });
    }

    bcryptjs.hash(password, setRounds, (err, hash) => {
        if (err) {
            console.log(err);
        }

        db.query(
            'INSERT INTO register(name, mail, contact, password, cpassword, address, area, state, country, category) VALUES (?,?,?,?,?,?,?,?,?,?)',
            [name, mail, contact, hash, hash, address, area, state, country, category],
            (err, result) => {
                if (err) {
                    console.log(err);
                    return res.status(500).json({ error: 'Internal Server Error' });
                } else {
                    console.log(result);
                    return res.status(200).json({ message: 'Registration Successful' });
                }
            }
        );
    });
});

app.post('/login', async (req, res) => {
    const { mail, password } = req.body;

    db.query(
        "SELECT * FROM register WHERE mail=?",
        [mail],
        (err, result) => {
            if (err) {
                console.log("Error:", err);
                res.status(500).json({ error: 'Internal Server Error' });
                return;
            }

            if (result.length > 0) {
                bcryptjs.compare(password, result[0].password, (err, response) => {
                    if (response) {
                        const id = result[0].id;
                        const token = jwt.sign({ id }, "success", { expiresIn: '1h' });
                        const userData = result[0];
                        res.json({ auth: true, token: token, result: userData, message: 'Login Successful' });
                    } else {
                        res.status(401).json({ message: 'Invalid Credentials' });
                    }
                });
            } else {
                res.status(401).json({ message: 'Invalid Credentials' });
            }
        }
    );
});

const verJWT = (req, res, next) => {
    const token = req.headers["x-access-token"];
    if (!token) {
        res.send("We need token give it next time");
    } else {
        jwt.verify(token, "success", (err, decoded) => {
            if (err) {
                res.json({ auth: false, message: "Failed to authenticate" });
            } else {
                req.mail = decoded.id;
                next();
            }
        });
    }
};

app.get('/isAuth', verJWT, (req, res) => {
    const userDetails = {
        mail: req.mail,
    };
    res.json({ result: userDetails });
});

app.post('/owner', upload.fields([
    { name: 'hall', maxCount: 1 },
    { name: 'kitchen', maxCount: 1 },
    { name: 'bedroomone', maxCount: 1 },
    { name: 'toiletone', maxCount: 1 },
    { name: 'bedroomtwo', maxCount: 1 },
    { name: 'toilettwo', maxCount: 1 }
  ]), (req, res) => {
    const { name, contact, address, mail, area, state, country, category, amount } = req.body;
    const { hall, kitchen, bedroomone, toiletone, bedroomtwo, toilettwo } = req.files;
  
    db.query(
      'INSERT INTO owner (name, contact, address, mail, area, state, country, category, hall, kitchen, bedroomone, toiletone, bedroomtwo, toilettwo, amount) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [name, contact, address, mail, area, state, country, category, hall[0].path, kitchen[0].path, bedroomone[0].path, toiletone[0].path, bedroomtwo ? bedroomtwo[0].path : null, toilettwo ? toilettwo[0].path : null, amount],
      (err, result) => {
        if (err) {
          console.error(err);
          return res.status(500).json({ error: 'Internal Server Error' });
        } else {
          console.log(result);
          return res.status(200).json({ message: 'Owner details inserted successfully' });
        }
      }
    );
  });

app.get('/owners', (req, res) => {
    db.query(
        'SELECT * FROM owner WHERE category = ?',
        ['Student'],
        (err, result) => {
            if (err) {
                console.log(err);
                return res.status(500).json({ error: 'Internal Server Error' });
            } else {
                // Send the result containing BLOB data as response
                res.status(200).json({ owners: result });
            }
        }
    );
});

app.get('/ownern', (req, res) => {
    db.query(
        'SELECT * FROM owner WHERE category = ?',
        ['Normal user'],
        (err, result) => {
            if (err) {
                console.log(err);
                return res.status(500).json({ error: 'Internal Server Error' });
            } else {
                // Send the result containing BLOB data as response
                res.status(200).json({ owners: result });
            }
        }
    );
});

app.get('/ownerp', (req, res) => {
    db.query(
        'SELECT * FROM owner WHERE category = ?',
        ['Pg'],
        (err, result) => {
            if (err) {
                console.log(err);
                return res.status(500).json({ error: 'Internal Server Error' });
            } else {
                // Send the result containing BLOB data as response
                res.status(200).json({ owners: result });
            }
        }
    );
});

app.post('/studentreq', (req, res) => {
    const { name, mail, category, contact, ownername, ownercontact, ownermail } = req.body;

    db.query(
        'INSERT INTO studentenquire (name, mail, category, contact, ownername, ownercontact, ownermail) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [name, mail, category, contact, ownername, ownercontact, ownermail],
        (err, result) => {
            if (err) {
                console.log(err);
                return res.status(500).json({ error: 'Internal Server Error' });
            } else {
                console.log(result);
                
                const productDetails = `
                    Name: ${name} 
                    Email: ${mail}
                    Contact: ${contact}
                    Category: ${category}
                `;

                const transporter = nodemailer.createTransport({
                    service: 'gmail',
                    auth: {
                        user: 'gokul8506@gmail.com',
                        pass: 'tdmc ggvc itfc oagr'
                    }
                });

                const mailOptions = {
                    from: 'gokul8506@gmail.com',
                    to: ownermail,
                    subject: 'Enquiry Request',
                    text: `Dear owner ${ownername}, you have received a request from the user ${name}😊\n\nUser Details\n${productDetails}\n\n\n\n\t\t\t'With regards Team Easy Homes 🏠'`
                };

                transporter.sendMail(mailOptions, (error, info) => {
                    if (error) {
                        console.error('Error sending email:', error);
                        return res.status(500).json({ error: 'Failed to send email' });
                    } else {
                        console.log('Email sent:', info.response);
                        return res.status(200).json({ message: 'Enquiry details inserted successfully and email sent' });
                    }
                });
            }
        }
    );
});


app.get('/studentacc', (req, res) => {
    const ownername = req.query.ownername;

    db.query(
        'SELECT * FROM studentenquire WHERE ownername = ?',
        [ownername],
        (err, result) => {
            if (err) {
                console.log(err);
                return res.status(500).json({ error: 'Internal Server Error' });
            } else {
                res.status(200).json(result);
            }
        }
    );
});


app.get('/studentaccept', (req, res) => {
    const name = req.query.name;

    db.query(
        'SELECT * FROM studentenquire WHERE name = ?',
        [name],
        (err, result) => {
            if (err) {
                console.log(err);
                return res.status(500).json({ error: 'Internal Server Error' });
            } else {
                res.status(200).json(result);
            }
        }
    );
});

  function verifyToken(req, res, next) {
    const token = req.headers['x-access-token'];
    if (!token) {
      return res.status(403).json({ auth: false, message: 'No token provided.' });
    }
  
    jwt.verify(token, 'success', (err, decoded) => {
      if (err) {
        return res.status(500).json({ auth: false, message: 'Failed to authenticate token.' });
      }
      req.userId = decoded.id;
      next();
    });
  }

app.delete('/api/enquiries/:id', (req, res) => {
    const enquiryId = req.params.id;
    db.query(
        'DELETE FROM studentenquire WHERE id = ?',
        [enquiryId],
        (err, result) => {
            if (err) {
                console.log(err);
                return res.status(500).json({ error: 'Internal Server Error' });
            } else {
                console.log(result);

                // Check if the row was successfully deleted
                if (result.affectedRows > 0) {
                    return res.status(200).json({ message: 'Enquiry cancelled successfully' });
                } else {
                    return res.status(404).json({ error: 'Enquiry not found' });
                }
            }
        }
    );
});


app.put('/api/enquiries/:id/accept', (req, res) => {
    const enquiryId = req.params.id;

    db.query(
        'SELECT * FROM studentenquire WHERE id = ?',
        [enquiryId],
        (err, results) => {
            if (err || results.length === 0) {
                return res.status(404).json({ error: 'Enquiry not found' });
            }

            const enquiry = results[0];
            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: 'gokul8506@gmail.com',
                    pass: 'tdmc ggvc itfc oagr'
                }
            });

            const mailOptions = {
                from: 'gokul8506@gmail.com',
                to: enquiry.mail,
                subject: 'Enquiry Accepted',
                text: `Dear User ${enquiry.name}, your enquiry request from ${enquiry.ownername} has been accepted. 
                \n\nDetails:\n\nName: ${enquiry.ownername}\nContact: ${enquiry.contact}\nCategory: ${enquiry.category}\n\nWith regards,\nTeam Easy Homes 🏠`
            };

            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    console.error('Error sending email:', error);
                    return res.status(500).json({ error: 'Failed to send email' });
                } else {
                    console.log('Email sent:', info.response);
                    db.query(
                        'UPDATE studentenquire SET status = ? WHERE id = ?',
                        ['accepted', enquiryId],
                        (updateErr, updateResult) => {
                            if (updateErr) {
                                return res.status(500).json({ error: 'Failed to update enquiry status' });
                            }
                            return res.status(200).json({ message: 'Enquiry accepted and email sent' });
                        }
                    );
                }
            });
        }
    );
});


app.get('/own/:name', (req, res) => {
    const ownerName = req.params.name;
    db.query(
        'SELECT * FROM owner WHERE name=?',
        [ownerName],
        (err, result) => {
            if (err) {
                console.log(err);
                return res.status(500).json({ error: 'Internal Server Error' });
            } else {
                return res.status(200).json({ owners: result });
            }
        }
    );
});



app.delete('/own/:id', (req, res) => {
    const postId = req.params.id;
    db.query(
        'DELETE FROM owner WHERE id=?',
        [postId],
        (err, result) => {
            if (err) {
                console.log(err);
                return res.status(500).json({ error: 'Internal Server Error' });
            } else {
                return res.status(200).json({ message: 'Post deleted successfully' });
            }
        }
    );
});






app.listen(3002, () => {
    console.log('Server started');
});
