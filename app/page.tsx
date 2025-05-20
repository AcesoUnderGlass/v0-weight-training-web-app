"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Pause, Play, Download } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface ExerciseData {
  name: string
  time: number
  weight: string
}

interface WorkoutSession {
  id: string
  date: string
  exercises: ExerciseData[]
}

export default function WeightTrainingTracker() {
  const { toast } = useToast()
  const [exercises, setExercises] = useState<ExerciseData[]>([
    { name: "Squats", time: 0, weight: "" },
    { name: "Chest Press", time: 0, weight: "" },
    { name: "Bent Over Row", time: 0, weight: "" },
    { name: "Tricep Raise", time: 0, weight: "" },
  ])

  const [activeTimers, setActiveTimers] = useState<{ [key: string]: boolean }>({
    Squats: false,
    "Chest Press": false,
    "Bent Over Row": false,
    "Tricep Raise": false,
  })

  const [intervalIds, setIntervalIds] = useState<{ [key: string]: NodeJS.Timeout | null }>({})
  const [workoutHistory, setWorkoutHistory] = useState<WorkoutSession[]>([])

  // Load workout history from localStorage on component mount
  useEffect(() => {
    const savedWorkouts = localStorage.getItem("workoutHistory")
    if (savedWorkouts) {
      setWorkoutHistory(JSON.parse(savedWorkouts))
    }
  }, [])

  const toggleTimer = (exerciseName: string) => {
    const isActive = activeTimers[exerciseName]

    if (isActive) {
      // Stop timer
      if (intervalIds[exerciseName]) {
        clearInterval(intervalIds[exerciseName]!)
        setIntervalIds((prev) => ({ ...prev, [exerciseName]: null }))
      }
    } else {
      // Start timer
      const intervalId = setInterval(() => {
        setExercises((prev) => prev.map((ex) => (ex.name === exerciseName ? { ...ex, time: ex.time + 1 } : ex)))
      }, 1000)

      setIntervalIds((prev) => ({ ...prev, [exerciseName]: intervalId }))
    }

    setActiveTimers((prev) => ({ ...prev, [exerciseName]: !isActive }))
  }

  const handleWeightChange = (exerciseName: string, weight: string) => {
    setExercises((prev) => prev.map((ex) => (ex.name === exerciseName ? { ...ex, weight } : ex)))
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const handleSubmit = () => {
    // Stop all active timers
    Object.entries(intervalIds).forEach(([name, id]) => {
      if (id) {
        clearInterval(id)
        setIntervalIds((prev) => ({ ...prev, [name]: null }))
      }
    })

    setActiveTimers({
      Squats: false,
      "Chest Press": false,
      "Bent Over Row": false,
      "Tricep Raise": false,
    })

    // Create a new workout session
    const newWorkout: WorkoutSession = {
      id: Date.now().toString(),
      date: new Date().toLocaleString(),
      exercises: [...exercises],
    }

    // Update workout history
    const updatedHistory = [newWorkout, ...workoutHistory].slice(0, 10) // Keep only the last 10 workouts
    setWorkoutHistory(updatedHistory)

    // Save to localStorage
    localStorage.setItem("workoutHistory", JSON.stringify(updatedHistory))

    toast({
      title: "Workout Recorded",
      description: "Your workout data has been saved locally.",
    })

    // Reset timers but keep weights
    setExercises((prev) => prev.map((ex) => ({ ...ex, time: 0 })))
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const exportToCSV = () => {
    // Create CSV headers
    const headers = ["Date", "Exercise", "Time (mm:ss)", "Weight (lbs)"]

    // Create CSV rows
    const rows: string[][] = []

    workoutHistory.forEach((workout) => {
      workout.exercises.forEach((exercise) => {
        rows.push([workout.date, exercise.name, formatTime(exercise.time), exercise.weight || "0"])
      })
    })

    // Combine headers and rows
    const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n")

    // Create a Blob with the CSV data
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })

    // Create a download link
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `workout-history-${new Date().toISOString().split("T")[0]}.csv`)
    link.style.visibility = "hidden"

    // Append to document, trigger download and clean up
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    toast({
      title: "Export Successful",
      description: "Your workout history has been exported as a CSV file.",
    })
  }

  return (
    <div className="container max-w-3xl py-8">
      <h1 className="text-3xl font-bold text-center mb-8">SuperSlow Weight Training Tracker</h1>

      <div className="grid gap-6">
        {exercises.map((exercise) => (
          <Card key={exercise.name}>
            <CardHeader>
              <CardTitle>{exercise.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                <div className="flex items-center gap-2">
                  <Button
                    variant={activeTimers[exercise.name] ? "destructive" : "default"}
                    size="icon"
                    onClick={() => toggleTimer(exercise.name)}
                    aria-label={activeTimers[exercise.name] ? "Stop timer" : "Start timer"}
                  >
                    {activeTimers[exercise.name] ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </Button>
                  <div className="text-2xl font-mono tabular-nums">{formatTime(exercise.time)}</div>
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor={`weight-${exercise.name}`}>Weight (lbs)</Label>
                  <Input
                    id={`weight-${exercise.name}`}
                    type="number"
                    placeholder="Enter weight"
                    value={exercise.weight}
                    onChange={(e) => handleWeightChange(exercise.name, e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        <Button size="lg" className="mt-4" onClick={handleSubmit}>
          Submit Workout
        </Button>
      </div>

      {workoutHistory.length > 0 && (
        <div className="mt-12">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Recent Workouts</h2>
            <Button variant="outline" onClick={exportToCSV} className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>
          <div className="grid gap-6">
            {workoutHistory.slice(0, 4).map((workout) => (
              <Card key={workout.id}>
                <CardHeader>
                  <CardTitle className="text-lg">Workout on {workout.date}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {workout.exercises.map((exercise) => (
                      <div key={exercise.name} className="flex justify-between border-b pb-2">
                        <span className="font-medium">{exercise.name}</span>
                        <div className="text-right">
                          <div>{formatTime(exercise.time)}</div>
                          <div>{exercise.weight ? `${exercise.weight} lbs` : "No weight recorded"}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
