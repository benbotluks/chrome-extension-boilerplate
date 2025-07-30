import { useState } from 'react'
import * as chat from '@botpress/chat'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <div>
        <a href="https://vitejs.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <div className="card">
        <button onClick={
          async () => {
            setCount((count) => count + 1)
            await getMessages()
          }
        }>
          count is {count}
        </button>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </>
  )
}

const getMessages = async () => {
  const webhookId = import.meta.env.VITE_WEBHOOK_ID

  const client = await chat.Client.connect({
    webhookId
  })

  const { conversation } = await client.createConversation({})
  const { messages } = await client.listMessages({ conversationId: conversation.id })
  // const conversation = await client.getConversation({ id: messages[0].conversationId })
  console.log(conversation)
  console.log(messages)
}

export default App
