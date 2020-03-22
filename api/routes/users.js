const express = require('express')
const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const router = express.Router()
const Freelancer = require('../models/freelancer')
const User = require('../models/user')
const passport = require('passport')
const cookies = require('cookies')
const jwt = require('jsonwebtoken');
const sendEmail = require('../../scripts/sendEmail')
const auth = require('../../config/auth')

const {registerValidation, loginValidation} = require('../../scripts/validate')

//Creating a new user
router.post('/register', async (req, res) => {

    // console.log('POST Request')

    // //IF INPUT IS INVALID
    const {error} = registerValidation(req.body)
    if(error) return res.status(400).send(error.details[0].message)

    // console.log('Data Validated')

    // //IF EMAIL ALREADY EXIST
    const emailExist = await User.findOne({email: req.body.email})
    if(emailExist) return res.status(400).send('Email Already Exist')

    //console.log('Its a new email')

    //Hass Password
    const salt = await bcrypt.genSalt(10)
    const hashPassword = await bcrypt.hash(req.body.password, salt)
    
    
    const newUser = new User ({

        _id: new mongoose.Types.ObjectId(),
        name: req.body.name,
        email: req.body.email,
        contact: req.body.contact,
        password: hashPassword
    })    

    if(!error && !emailExist){
        await newUser.save().then(result => {
            console.log(result)
            res.send(result)
          })   
          .catch(err =>{
              console.log("Catch")
              res.json({
                  message: err
              })
          } )   
    }
    

})

router.post('/login', async (req, res, next) => {   
    
    if(req.isAuthenticated()){
        res.status(400).send({
            "error": true,
            "message": "You're already logged In",
            "data":  null
        })
    }
    else {
        passport.authenticate('client', {
        session: true
        }, (err, user) => {
            if(err) return next(err)
            if (!user) { 
                return res.send({
                "error": true,
                "message": "Log In Failed",
                "data": null
                }) 
            }
            req.logIn(user, function(err) {
            console.log(err);
            if (err) { return next(err) }         
            

            res.send({
                "error": null,
                "message": "Log In Success",
                "data":  req.session.passport
                })
            
            })
        })(req, res, next) 
    }    
})

router.get("/currentuser", auth, async (req, res) => {

    if(req.session.passport){
         res.status(200).send(req.session.passport.user)
    }
   
})

router.get("/logout", (req, res) => {
    console.log("ewfakajwekf")
    
    req.logout()
    console.log(req.session)
    req.session.destroy((err)=>{
        console.log(err);
    })
    res.send(req.session)
})

//for email

router.get('/verify', (req, res) => {       

    if(req.session.passport.user.userGroup === 'user'){
        const email = req.session.passport.user.user.email
        const hashEmail = jwt.sign({email: req.body.email},'token-secret-key');

        const html = '<a href="http://localhost:4000/api/user/setverify/' + hashEmail + '"> Click here to verify email </a>'

        sendEmail(email, "Verify your email", html, (success, message) => {
            if(success){
                res.status(200).json({
                    type: "success",
                    message: "Email Sent Successfully"
                })
            }
            else{
                res.status(403).json({
                    type: "error",
                    message: "Some error is sending Email"
                })
            }
        })
    }

    
    
})


router.get('/setverify/:token', async (req, res) => {
       
    const verified = jwt.verify(req.params.token , 'token-secret-key' );
    console.log(verified)
    if(verified){
       User.updateOne({email : verified.email},
        {$set : {
            verified : true
        }}).then(result => {
            console.log("User Verified")
            res.status(200).redirect('http://www.peppershades.com/emailverify/')
        }).catch(err => {
            res.status(400).send(err)
        })
    }
 
 })

//For password
router.post('/reset', async (req, res) => {
        await User.findOne({email: req.body.email})
        .then(user => {
            jwt.sign({_id: user._id}, 'secret-token', (err, token) => {
                if(err){
                    res.status(500)
                }
                console.log(token)
                sendEmail(req.body.email, 
                    "Reset Password", 
                    token, async (success, message) => {
                            if(success){
                                res.status(200).json({
                                    type: 'Success',
                                    message: 'An Email has been successfully sent to you Mail Id'
                                })
                            }
                    })
            })  
        }) 
        .catch(err => {
            res.status(400).json({
                type: "error",
                message: "User does not exist."
            })
        })
})

router.patch('/password/reset', async (req, res) => {   

    

})

    // for updating the e -mail
router.patch("/update", async (req, res) => {

    const id = req.session.passport.user.user._id
    let updated = 0

    if(req.body.check.email)
    {
        val = req.body.check.email
        if(User.find({email:val}))
        {
            res.send("E-mail already exist")

        }
        else{
        User.updateOne({_id:id},{$set:{"email":req.body.email}})    
        .then(result=>
        {
            updated =updated +1
        })
        .catch(err=>{
           res.status(400).json({
               message:err
           })
        })
    }
    }

    console.log(req.body.check)
    //for updating the contact , company , jobtitle
    if(req.body.check.contact === true){
        User.updateOne({_id: id}, {$set: { contact: req.body.contact}})
        .then(result => {
            console.log(result)
            updated =updated +1
        })
        .catch(err => {
            res.status(400).json({
                message: err
            })
        })
    }
    if(req.body.check.company === true){
        User.updateOne({_id: id}, {$set: { company: req.body.company}})
        .then(result => {
            console.log(result)
            updated =updated +1
        })
        .catch(err => {
            res.status(400).json({
                message: err
            })
        })
    }
    if(req.body.check.jobTitle === true){
        User.updateOne({_id: id}, {$set: { "jobTitle": req.body.jobTitle}})
        .then(result => {
            console.log(result)
            updated =updated +1
        })
        .catch(err => {
            res.status(400).json({
                message: err
            })
        })
    }
    res.status(200).json({
        message: "User Details Updated Successfully",
        count: updated
    })

})

//For updating the password

 router.patch('/password/change',auth, async (req, res) => {    


    const id = req.session.passport.user.user._id

     await User.findOne({_id: id}).then(async account => {
        const pass = await bcrypt.compare(req.body.oldPassword, account.password)
        if(!pass) return res.status(400).send("Password is incorrect")

        const salt = await bcrypt.genSalt(10)
        const hashPassword = await bcrypt.hash(req.body.newPassword, salt)  

        await User.updateOne({_id: account._id}, {
            $set: {"password": hashPassword}
            }).then( result => {
                res.send(result)
            }).catch(err => {
                res.sendStatus(403)
        })

     })
     

 }) 



// Export it Globally
module.exports = router