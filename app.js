const express = require('express'),
     bodyParser = require('body-parser'),
     mongoose = require('mongoose'),
     File = require('./models/file'),
     User = require('./models/user'),    
     passport = require('passport'),
     LocalStrategy = require('passport-local')
     multer = require('multer'); 
     var encryptor = require('file-encryptor');
    var Path = require('path');
     var fs = require('fs');

     
     const crypto2 = require('crypto2');

const app = express();
app.set('view engine','ejs');
mongoose.connect('mongodb://localhost/file_transfer');
app.use(bodyParser.urlencoded({extended: true}));

const fileStorage = multer.diskStorage({
    destination: (req,file,cb)=>{
        cb(null,'uploads');
    },       
    filename:(req,file,cb)=>{
        cb(null,  Date.now()+'-'+file.originalname);
    }
});

var upload = multer({storage: fileStorage}).single('card');
//app.use();

app.use(require('express-session')({
    secret: "best in the world",
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());
//seedDB();
app.use((req,res,next)=>{
    res.locals.currentUser = req.user;
    next();
});



app.get('/',(req,res)=>{
    res.render('index')
});
app.get('/home',isLoggedIn,(req,res)=>{
    res.render('home')
});
app.get('/upload',isLoggedIn,(req,res)=>{
    User.find({},function(err,allUsers){
        if(err){
            console.log(err);
        }else{
            res.render('upload',{users: allUsers});
        }
    });    
   
});
app.get('/download',isLoggedIn,(req,res)=>{
    User.findById(req.user._id).populate('files').exec((err,foundUser)=>{
        if(err){
            console.log(err);
        }else{            
            res.render('download',{user: foundUser});
        }
    });


});

app.post('/download',isLoggedIn,function(req,res){
    const privateKey = req.body.key;

    const id = req.body.id;
    File.findById(id,async function (err,file){
        if(err){
            console.log(err);
        }
        console.log(file);
        const fname = file.file.slice(9,-4);
        const path = './downloads'+fname+'.pdf' ;
        console.log(fname);
        //decrypted is the secret key decrypted
        const decrypted = await crypto2.decrypt.rsa(file.secret_key, privateKey);
        //var options = { algorithm: 'aes256' };
        encryptor.decryptFile(file.file, path, decrypted,function(err){
            if(err){
                console.log(err);
            }
            filepath = Path.join(__dirname,'./downloads')+fname+'.pdf';
            console.log(filepath);
            res.sendFile(filepath); 
        });
        
    });   
    
});


app.get('/key-gen',isLoggedIn,(req,res)=>{
    res.render('keygen');
});
app.get('/generate',isLoggedIn,async function(req,res){
    const { privateKey, publicKey } = await crypto2.createKeyPair();
    User.findByIdAndUpdate(req.user._id, {public_key: publicKey},(err,updated)=>{
        if(err){
            console.log(err);
        }
        console.log(updated);
        res.send(privateKey);
    });
    // console.log(privateKey);
    // const encrypted = await crypto2.encrypt.rsa('the native web', publicKey);
    // console.log(encrypted);
    // const decrypted = await crypto2.decrypt.rsa(encrypted, privateKey);
    // console.log(decrypted);
    
});




app.post('/upload',async function (req,res){
    upload(req,res,async function(err) {
        if(err) {
            console.log(err);
            //return res.end("Error uploading file.");
        }
        
        const from = req.user.username;
        const file = req.file;
        const str = file.filename.slice(0,-4);
        
        
        User.findById(req.body.user,async function(err,user){
            if(err){
                console.log(err);
            }else{
                const publicKey = user.public_key;
                //console.log(str);        
                const encryptedFile = './uploads/'+str+'.dat';
                //console.log(encryptedFile);
                // Encrypt file.
                var key = Date.now().toString();
                console.log(key);
                const encrypted = await crypto2.encrypt.rsa(key, publicKey);
                //var options = { algorithm: 'aes256' };
                encryptor.encryptFile('./uploads/'+file.filename, encryptedFile, key, function(err) {
                    // Encryption complete.
                });

                var storeFile = new File({
                    from: from,
                    file: encryptedFile,
                    secret_key: encrypted
                });
                storeFile.save();
                user.files.push(storeFile);
                user.save();
                
            }
        });
       
    }); 
    res.redirect('/home');
});





//==============================
//Auth Routes
//==============================
app.get('/register',(req,res)=>{

    res.render('register');
});

app.post('/register',(req,res)=>{
    var newUser = new User({username:req.body.username});
    User.register(newUser,req.body.password,(err,user)=>{
        if(err){
            console.log(err);
            return res.render('register');
        }else{
            passport.authenticate('local')(req, res, function(){
                res.redirect('/home');
            });
        }
    });
});
//login

app.get('/login',(req,res)=>{
    res.render('login');
});

app.post('/login',passport.authenticate('local', 
    {
        successRedirect: '/home',
        failureRedirect: '/login'   
    }),(req,res)=>{
    
});
//logout 

app.get('/logout',(req,res)=>{
    req.logout();
    res.redirect('/login');
});

//middleware

function isLoggedIn(req, res, next){
    if(req.isAuthenticated()){
        return next();
    }
    res.redirect('/login');
};
//=============
//connect to server
app.listen(3000,function(){
    console.log('server started at port 3000');
});