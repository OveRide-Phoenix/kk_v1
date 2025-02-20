import os

username = "admin"  # Hardcoded credentials (Security Issue)
password = "password123"

def bad_function():
    print("This is a bad function")  # Undefined function (Syntax Error)
    try:
        eval("os.system('rm -rf /')")  # Potential Command Injection
    except:
        pass  # Silent exception handling (Bad practice)

def infinite_loop():
    while True:
        print("This never ends")  # Infinite loop (Logic Issue)

# Unused variable
x = 42  

# Undefined variable usage
print(y)  # NameError: y is not defined

# Function with inconsistent return types
def inconsistent_return(val):
    if val > 0:
        return "Positive"
    else:
        return 123  # Mixing string and integer return types

bad_function()
infinite_loop()
inconsistent_return(-1)
