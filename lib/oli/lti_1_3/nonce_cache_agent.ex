defmodule Oli.Lti_1_3.NonceCacheAgent do
  use Agent

  @doc """
  Starts a new cache instance
  """
  def start_link(_opts) do
    Agent.start_link(fn -> %{} end)
  end

  @doc """
  Checks the cache for a given nonce
  """
  def has(nonce) do
    Agent.get(:lti_1_3_nonces, &Map.has_key?(&1, nonce))
  end

  @doc """
  Puts a nonce into the cache
  """
  def put(nonce) do
    Agent.update(:lti_1_3_nonces, &Map.put(&1, nonce, Timex.now))
  end

  @doc """
  Removes outdated nonces created from requests that cant be replayed because
  they would now be considered expired
  """
  def cleanup() do
    #TODO implement nonce cleanup. this should either be run on every nonce insertion or as a scheduled task
  end
end
