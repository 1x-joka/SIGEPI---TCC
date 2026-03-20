import express from 'express'

const app = express() // Dentro do app teremos acesso a toda a biblioteca do express

const usuarios = []

app.post('/usuarios', (req, res) => {
    
})

app.get('/usuarios', (req, res) => { // Para criar um usuário (método http "post") e usando arrow function
    res.send('Ok')
})

app.listen(3000) // Indicando a porta do meu computador que ele vai rodar