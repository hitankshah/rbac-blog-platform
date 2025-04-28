"use client"

import { useState, useEffect } from "react"
import { useParams, Link } from "react-router-dom"
import axios from "axios"

const BlogPost = () => {
  const [post, setPost] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const { id } = useParams()

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const res = await axios.get(`/blogs/${id}`)
        setPost(res.data)
      } catch (err) {
        setError("Failed to fetch blog post")
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchPost()
  }, [id])

  if (loading) {
    return <div className="text-center py-10">Loading...</div>
  }

  if (error) {
    return <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>
  }

  if (!post) {
    return (
      <div className="text-center py-10">
        <p>Blog post not found.</p>
        <Link to="/" className="text-blue-500 hover:text-blue-700 mt-4 inline-block">
          Back to Home
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto">
      <Link to="/" className="text-blue-500 hover:text-blue-700 mb-4 inline-block">
        &larr; Back to Home
      </Link>

      <article className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-3xl font-bold mb-4">{post.title}</h1>

        <div className="text-gray-600 mb-6">
          By {post.author.name} • {new Date(post.created_at).toLocaleDateString()}
        </div>

        <div className="prose max-w-none">
          {post.content.split("\n").map((paragraph, index) => (
            <p key={index} className="mb-4">
              {paragraph}
            </p>
          ))}
        </div>
      </article>
    </div>
  )
}

export default BlogPost
