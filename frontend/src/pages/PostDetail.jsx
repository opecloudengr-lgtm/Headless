import React, { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { api } from "../api/client.js";
import PostCard from "../components/PostCard.jsx";
import Spinner from "../components/Spinner.jsx";
import Alert from "../components/Alert.jsx";

export default function PostDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    api
      .post(id)
      .then((res) => active && setPost(res.post))
      .catch(() => active && setError("This post couldn't be found."))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [id]);

  if (loading) return <Spinner className="py-24" />;

  if (error || !post) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <Alert type="error">{error || "Post not found."}</Alert>
        <Link to="/timeline" className="btn-primary mt-6 inline-flex">
          Back to Timeline
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <PostCard post={post} onDeleted={() => navigate("/timeline")} defaultShowComments />
    </div>
  );
}
