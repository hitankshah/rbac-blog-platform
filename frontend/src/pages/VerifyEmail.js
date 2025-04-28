"use client"

import { useEffect, useState, useContext } from "react"
import { useParams, Link } from "react-router-dom"
import { AuthContext } from "../context/AuthContext"

const VerifyEmail = () => {
  const [status, setStatus] = useState("verifying")
  const [message, setMessage] = useState("")
  const { token } = useParams()
  const { verifyEmail } = useContext(AuthContext)

  useEffect(() => {
    const verify = async () => {
      try {
        const res = await verifyEmail(token)
        setStatus("success")
        setMessage(res.message)
      } catch (err) {
        setStatus("error")
        setMessage(err.message || "Verification failed")
      }
    }

    verify()
  }, [token, verifyEmail])

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-bold mb-6 text-center">Email Verification</h1>

      {status === "verifying" && (
        <div className="text-center">
          <p>Verifying your email...</p>
        </div>
      )}

      {status === "success" && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          <p>{message}</p>
          <p className="mt-2">
            <Link to="/login" className="text-green-700 font-bold hover:underline">
              Click here to login
            </Link>
          </p>
        </div>
      )}

      {status === "error" && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p>{message}</p>
          <p className="mt-2">
            <Link to="/register" className="text-red-700 font-bold hover:underline">
              Click here to register again
            </Link>
          </p>
        </div>
      )}
    </div>
  )
}

export default VerifyEmail
