"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Pause, Play, Download, Timer } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface ExerciseData {
  name: string
  time: number
  weight: string
  lapTime: number
}

interface WorkoutSession {
  id: string
  date: string
  exercises: ExerciseData[]
}

export default function WeightTrainingTracker() {
  const { toast } = useToast()
  const [exercises, setExercises] = useState<ExerciseData[]>([
    { name: "Squats", time: 0, weight: "", lapTime: 0 },
    { name: "Chest Press", time: 0, weight: "", lapTime: 0 },
    { name: "Bent Over Row", time: 0, weight: "", lapTime: 0 },
    { name: "Tricep Raise", time: 0, weight: "", lapTime: 0 },
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
      const parsedWorkouts = JSON.parse(savedWorkouts)
      setWorkoutHistory(parsedWorkouts)
      
      // If there are previous workouts, use the weights from the most recent one
      if (parsedWorkouts.length > 0) {
        const lastWorkout = parsedWorkouts[0]
        setExercises(prev => prev.map(ex => ({
          ...ex,
          weight: lastWorkout.exercises.find((e: ExerciseData) => e.name === ex.name)?.weight || ""
        })))
      }
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
        setExercises((prev) => prev.map((ex) => 
          ex.name === exerciseName 
            ? { ...ex, time: ex.time + 1, lapTime: ex.lapTime + 1 } 
            : ex
        ))
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
    setExercises((prev) => prev.map((ex) => ({ ...ex, time: 0, lapTime: 0 })))
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

  const hasImproved = (exerciseName: string) => {
    if (workoutHistory.length === 0) return false
    
    const lastWorkout = workoutHistory[0]
    const lastExercise = lastWorkout.exercises.find(e => e.name === exerciseName)
    const currentExercise = exercises.find(e => e.name === exerciseName)
    
    if (!lastExercise || !currentExercise) return false
    
    const weightImproved = Number(currentExercise.weight) > Number(lastExercise.weight)
    const timeImproved = currentExercise.time > lastExercise.time
    
    return weightImproved || timeImproved
  }

  const exportToCSV = () => {
    // Create CSV headers
    const headers = ["Date", "Time", "Exercise", "Time (mm:ss)", "Weight (lbs)"]

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

  const handleLap = (exerciseName: string) => {
    setExercises((prev) => prev.map((ex) => 
      ex.name === exerciseName ? { ...ex, lapTime: 0 } : ex
    ))
  }

  return (
    <div className="container max-w-3xl px-4 py-4 sm:py-8">
      <h1 className="text-2xl sm:text-3xl font-bold text-center mb-4 sm:mb-8">SuperSlow Weight Training Tracker</h1>

      <div className="grid gap-4 sm:gap-6">
        {exercises.map((exercise) => (
          <Card key={exercise.name}>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-lg sm:text-xl">{exercise.name}</CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-6 items-center">
                <div className="flex items-center gap-2">
                  <Button
                    variant={activeTimers[exercise.name] ? "destructive" : "default"}
                    size="icon"
                    onClick={() => toggleTimer(exercise.name)}
                    aria-label={activeTimers[exercise.name] ? "Stop timer" : "Start timer"}
                    className="h-10 w-10 sm:h-12 sm:w-12"
                  >
                    {activeTimers[exercise.name] ? <Pause className="h-5 w-5 sm:h-6 sm:w-6" /> : <Play className="h-5 w-5 sm:h-6 sm:w-6" />}
                  </Button>
                  <div className="flex flex-col gap-1">
                    <div className={`text-xl sm:text-2xl font-mono tabular-nums ${hasImproved(exercise.name) ? 'text-green-500' : 'text-red-500'}`}>
                      {formatTime(exercise.time)}
                    </div>
                    <div className="text-xs sm:text-sm font-mono tabular-nums text-muted-foreground">
                      Lap: {formatTime(exercise.lapTime)}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleLap(exercise.name)}
                    disabled={!activeTimers[exercise.name]}
                    aria-label="Reset lap timer"
                    className="h-8 w-8 sm:h-9 sm:w-9 p-0"
                  >
                    <Timer className="h-4 w-4" />
                  </Button>
                </div>

                <div className="sm:col-span-2">
                  <Label htmlFor={`weight-${exercise.name}`} className="text-sm sm:text-base">Weight (lbs)</Label>
                  <Input
                    id={`weight-${exercise.name}`}
                    type="number"
                    placeholder="Enter weight"
                    value={exercise.weight}
                    onChange={(e) => handleWeightChange(exercise.name, e.target.value)}
                    className="h-9 sm:h-10"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        <Button size="lg" className="mt-4 h-11 sm:h-12 text-base" onClick={handleSubmit}>
          Submit Workout
        </Button>
      </div>

      {workoutHistory.length > 0 && (
        <div className="mt-8 sm:mt-12">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-4">
            <h2 className="text-xl sm:text-2xl font-bold">Recent Workouts</h2>
            <Button variant="outline" onClick={exportToCSV} className="flex items-center gap-2 h-9 sm:h-10">
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>
          <div className="grid gap-4 sm:gap-6">
            {workoutHistory.slice(0, 4).map((workout) => (
              <Card key={workout.id}>
                <CardHeader className="p-4 sm:p-6">
                  <CardTitle className="text-base sm:text-lg">Workout on {workout.date}</CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {workout.exercises.map((exercise) => (
                      <div key={exercise.name} className="flex justify-between border-b pb-2">
                        <span className="font-medium text-sm sm:text-base">{exercise.name}</span>
                        <div className="text-right">
                          <div className="text-sm sm:text-base">{formatTime(exercise.time)}</div>
                          <div className="text-sm sm:text-base">{exercise.weight ? `${exercise.weight} lbs` : "No weight recorded"}</div>
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
