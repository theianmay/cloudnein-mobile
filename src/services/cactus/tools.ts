import type { Tool } from "./types"

export const TOOL_GET_WEATHER: Tool = {
  name: "get_weather",
  description: "Get current weather for a location",
  parameters: {
    type: "object",
    properties: {
      location: { type: "string", description: "City name" },
    },
    required: ["location"],
  },
}

export const TOOL_SET_ALARM: Tool = {
  name: "set_alarm",
  description: "Set an alarm for a given time",
  parameters: {
    type: "object",
    properties: {
      hour: { type: "integer", description: "Hour to set the alarm for" },
      minute: { type: "integer", description: "Minute to set the alarm for" },
    },
    required: ["hour", "minute"],
  },
}

export const TOOL_SEND_MESSAGE: Tool = {
  name: "send_message",
  description: "Send a message to a contact",
  parameters: {
    type: "object",
    properties: {
      recipient: { type: "string", description: "Name of the person to send the message to" },
      message: { type: "string", description: "The message content to send" },
    },
    required: ["recipient", "message"],
  },
}

export const TOOL_CREATE_REMINDER: Tool = {
  name: "create_reminder",
  description: "Create a reminder with a title and time",
  parameters: {
    type: "object",
    properties: {
      title: { type: "string", description: "Reminder title" },
      time: { type: "string", description: "Time for the reminder (e.g. 3:00 PM)" },
    },
    required: ["title", "time"],
  },
}

export const TOOL_SEARCH_CONTACTS: Tool = {
  name: "search_contacts",
  description: "Search for a contact by name",
  parameters: {
    type: "object",
    properties: {
      query: { type: "string", description: "Name to search for" },
    },
    required: ["query"],
  },
}

export const TOOL_PLAY_MUSIC: Tool = {
  name: "play_music",
  description: "Play a song or playlist",
  parameters: {
    type: "object",
    properties: {
      song: { type: "string", description: "Song or playlist name" },
    },
    required: ["song"],
  },
}

export const TOOL_SET_TIMER: Tool = {
  name: "set_timer",
  description: "Set a countdown timer",
  parameters: {
    type: "object",
    properties: {
      minutes: { type: "integer", description: "Number of minutes" },
    },
    required: ["minutes"],
  },
}

export const ALL_TOOLS: Tool[] = [
  TOOL_GET_WEATHER,
  TOOL_SET_ALARM,
  TOOL_SEND_MESSAGE,
  TOOL_CREATE_REMINDER,
  TOOL_SEARCH_CONTACTS,
  TOOL_PLAY_MUSIC,
  TOOL_SET_TIMER,
]
