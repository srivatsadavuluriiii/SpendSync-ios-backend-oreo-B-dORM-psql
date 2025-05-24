import SwiftUI

struct InputFieldStyle: ViewModifier {
    enum InputState {
        case normal
        case focused
        case error
        case success
    }
    
    let state: InputState
    
    func body(content: Content) -> some View {
        content
            .padding()
            .background(
                RoundedRectangle(cornerRadius: 10)
                    .fill(Color(.systemGray6))
            )
            .overlay(
                RoundedRectangle(cornerRadius: 10)
                    .stroke(borderColor, lineWidth: borderWidth)
            )
    }
    
    private var borderColor: Color {
        switch state {
        case .normal:
            return Color.clear
        case .focused:
            return Color.blue.opacity(0.7)
        case .error:
            return Color.red
        case .success:
            return Color.green
        }
    }
    
    private var borderWidth: CGFloat {
        switch state {
        case .normal:
            return 0
        default:
            return 2
        }
    }
}

struct InputField: View {
    let label: String
    let placeholder: String
    @Binding var text: String
    var keyboardType: UIKeyboardType = .default
    var isSecure: Bool = false
    var errorMessage: String? = nil
    
    @FocusState private var isFocused: Bool
    
    private var inputState: InputFieldStyle.InputState {
        if let error = errorMessage, !error.isEmpty {
            return .error
        } else if isFocused {
            return .focused
        } else {
            return .normal
        }
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            // Label
            Text(label)
                .font(.headline)
                .foregroundColor(.primary)
            
            // Text Field
            SwiftUI.Group {
                if isSecure {
                    SecureField(placeholder, text: $text)
                        .keyboardType(keyboardType)
                } else {
                    TextField(placeholder, text: $text)
                        .keyboardType(keyboardType)
                }
            }
            .onTapGesture {
                isFocused = true
            }
            .focused($isFocused)
            .modifier(InputFieldStyle(state: inputState))
            
            // Error message if present
            if let error = errorMessage, !error.isEmpty {
                Text(error)
                    .font(.caption)
                    .foregroundColor(.red)
            }
        }
    }
}

// EXAMPLES
struct InputFieldPreview: View {
    @State private var text1 = ""
    @State private var text2 = ""
    @State private var text3 = "user@example.com"
    @State private var password = "password123"
    
    var body: some View {
        VStack(spacing: 20) {
            InputField(
                label: "Name",
                placeholder: "Enter your name",
                text: $text1
            )
            
            InputField(
                label: "Phone",
                placeholder: "Enter your phone number",
                text: $text2,
                keyboardType: .phonePad,
                errorMessage: "Please enter a valid phone number"
            )
            
            InputField(
                label: "Email",
                placeholder: "Enter your email",
                text: $text3,
                keyboardType: .emailAddress
            )
            
            InputField(
                label: "Password",
                placeholder: "Enter your password",
                text: $password,
                isSecure: true
            )
        }
        .padding()
    }
}

#Preview {
    InputFieldPreview()
} 