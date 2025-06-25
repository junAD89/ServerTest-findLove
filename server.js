import express from "express";


import 'dotenv/config'



const port = process.env.PORT;

const app = express();
// For parsing application/json
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Hello World!');
});


app.post('/genereteLetter', (req, res) => {
    const data = req.body;
    console.log(data);

    console.log(data.LetterRecipientName);
    console.log(data.LetterOccasion);
    console.log(data.LetterTone);
    console.log(data.LetterStyle);

    res.json({
        message: "Letter generated successfully",
    });

})


app.listen(port, () => {
    console.log("Server started " + port);

});
