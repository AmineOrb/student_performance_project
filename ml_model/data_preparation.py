import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_squared_error, r2_score
import joblib

# ------------------------------
# Step 1: Load and Inspect the Data
# ------------------------------

# Load the CSV file (ensure that student_grades.csv is in the same directory)
data = pd.read_csv("student_grades.csv")
print("Data head:")
print(data.head())

# ------------------------------
# Step 2: Preprocess and Split the Data
# ------------------------------

# Select features (X) and target (y)
# Features: AttendancePercent, ParticipationScore, PastGrade
# Target: FinalGrade
X = data[['AttendancePercent', 'ParticipationScore', 'PastGrade']]
y = data['FinalGrade']

# Optionally, check basic statistics for insight
print("\nData statistics:")
print(data.describe())

# Split the data (80% training, 20% testing)
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
print("\nTraining set size:", X_train.shape)
print("Testing set size:", X_test.shape)

# ------------------------------
# Step 3: Train the Random Forest Model
# ------------------------------

# Initialize and train the model
model = RandomForestRegressor(n_estimators=100, random_state=42)
model.fit(X_train, y_train)

# ------------------------------
# Step 4: Evaluate the Model
# ------------------------------

# Make predictions on the test set
predictions = model.predict(X_test)

# Calculate evaluation metrics
mse = mean_squared_error(y_test, predictions)
r2 = r2_score(y_test, predictions)

print("\nRandom Forest Regressor Results:")
print(f"Mean Squared Error (MSE): {mse:.2f}")
print(f"R-squared (R2): {r2:.2f}")

# ------------------------------
# Step 5: Save the Trained Model
# ------------------------------

model_filename = "final_student_model.pkl"
joblib.dump(model, model_filename)
print(f"\nModel saved as {model_filename}")
