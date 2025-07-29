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
            const webhookId = import.meta.env.VITE_WEBHOOK_ID
            if (!webhookId) {
              throw new Error('WEBHOOK_ID is required')
            }

            // 0. connect and create a user
            const client = await chat.Client.connect({ webhookId })

            // 1. create a conversation
            const { conversation } = await client.createConversation({})

            // 2. send a message
            const response = await client.createMessage({
              conversationId: conversation.id,
              payload: {
                type: 'text',
                text: 'hello world',
              },
            })
            console.log(response)
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

export default App
